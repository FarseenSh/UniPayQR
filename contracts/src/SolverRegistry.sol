// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract SolverRegistry is ReentrancyGuard, Ownable {
    using SafeMath for uint256;

    // Tier definitions: 0 = Free, 1 = 100, 2 = 500, 3 = 1000, 4 = 10000
    enum SolverTier {
        Free,      // 0: 0 stake, 10k INR/month limit, 0.5% fee
        Tier1,     // 1: 100 mUSD stake
        Tier2,     // 2: 500 mUSD stake
        Tier3,     // 3: 1000 mUSD stake
        Tier4      // 4: 10000 mUSD stake, 30L INR/month limit, 2% fee
    }

    IERC20 public immutable mUSD;
    uint256 public totalSolvers;

    struct Solver {
        address solverAddress;
        uint256 stakedAmount;
        SolverTier tier;
        uint256 totalVolume;
        uint256 successfulPayments;
        uint256 failedPayments;
        bool isActive;
        uint256 registeredAt;
        string location;
        uint256 feePercent;
        uint256 monthlyVolumeLimit; // In INR
        uint256 currentMonthVolume; // In INR
        uint256 monthStartTimestamp;
    }

    mapping(address => Solver) public solvers;
    address[] public solverList;
    mapping(string => address[]) public solversByLocation;

    event SolverRegistered(
        address indexed solver,
        uint256 stakedAmount,
        string location,
        uint256 feePercent
    );

    event SolverDeactivated(address indexed solver);
    event SuccessRecorded(address indexed solver, uint256 volume);
    event FailureRecorded(address indexed solver);
    event StakeUpdated(address indexed solver, uint256 newAmount);

    constructor(address _mUSD) {
        require(_mUSD != address(0), "Invalid mUSD");
        mUSD = IERC20(_mUSD);
    }

    function registerSolver(
        uint256 _stakeAmount,
        string memory _location,
        uint256 _feePercent
    ) external nonReentrant {
        require(
            solvers[msg.sender].solverAddress == address(0),
            "Already registered"
        );
        require(bytes(_location).length > 0, "Location required");
        require(_feePercent <= 1000, "Fee too high");

        SolverTier tier;
        uint256 monthlyLimit;

        // Determine tier based on stake amount
        if (_stakeAmount == 0) {
            tier = SolverTier.Free;
            monthlyLimit = 10000 * 10**18; // 10k INR
            require(_feePercent == 50, "Free tier must use 0.5% fee"); // 50 = 0.5% in basis points
        } else if (_stakeAmount == 100 * 10**18) {
            tier = SolverTier.Tier1;
            monthlyLimit = 50000 * 10**18; // ₹50,000/month
            require(_feePercent == 75, "Tier 1 must use 0.75% fee"); // 75 = 0.75% in basis points
        } else if (_stakeAmount == 500 * 10**18) {
            tier = SolverTier.Tier2;
            monthlyLimit = 200000 * 10**18; // ₹2 Lakhs/month
            require(_feePercent == 100, "Tier 2 must use 1% fee"); // 100 = 1% in basis points
        } else if (_stakeAmount == 1000 * 10**18) {
            tier = SolverTier.Tier3;
            monthlyLimit = 500000 * 10**18; // ₹5 Lakhs/month
            require(_feePercent == 150, "Tier 3 must use 1.5% fee"); // 150 = 1.5% in basis points
        } else if (_stakeAmount == 10000 * 10**18) {
            tier = SolverTier.Tier4;
            monthlyLimit = type(uint256).max; // Unlimited
            require(_feePercent == 200, "Tier 4 must use 2% fee"); // 200 = 2% in basis points
        } else {
            revert("Invalid stake amount. Must be 0, 100, 500, 1000, or 10000 mUSD");
        }

        // Transfer stake only if non-zero
        if (_stakeAmount > 0) {
            require(
                mUSD.transferFrom(msg.sender, address(this), _stakeAmount),
                "Transfer failed"
            );
        }

        solvers[msg.sender] = Solver({
            solverAddress: msg.sender,
            stakedAmount: _stakeAmount,
            tier: tier,
            totalVolume: 0,
            successfulPayments: 0,
            failedPayments: 0,
            isActive: true,
            registeredAt: block.timestamp,
            location: _location,
            feePercent: _feePercent,
            monthlyVolumeLimit: monthlyLimit,
            currentMonthVolume: 0,
            monthStartTimestamp: block.timestamp
        });

        solverList.push(msg.sender);
        solversByLocation[_location].push(msg.sender);
        totalSolvers++;

        emit SolverRegistered(msg.sender, _stakeAmount, _location, _feePercent);
    }

    function addStake(uint256 _amount) external nonReentrant {
        require(solvers[msg.sender].isActive, "Not active");
        require(_amount > 0, "Invalid amount");

        require(
            mUSD.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );

        solvers[msg.sender].stakedAmount = solvers[msg.sender].stakedAmount.add(_amount);
        emit StakeUpdated(msg.sender, solvers[msg.sender].stakedAmount);
    }

    function withdrawStake(uint256 _amount) external nonReentrant {
        Solver storage solver = solvers[msg.sender];
        require(solver.isActive, "Not active");
        require(_amount > 0, "Invalid amount");
        
        uint256 newStake = solver.stakedAmount.sub(_amount);
        
        // Cannot withdraw below tier minimum
        if (solver.tier == SolverTier.Tier1 && newStake < 100 * 10**18) {
            revert("Cannot go below Tier 1 minimum (100 mUSD)");
        } else if (solver.tier == SolverTier.Tier2 && newStake < 500 * 10**18) {
            revert("Cannot go below Tier 2 minimum (500 mUSD)");
        } else if (solver.tier == SolverTier.Tier3 && newStake < 1000 * 10**18) {
            revert("Cannot go below Tier 3 minimum (1000 mUSD)");
        } else if (solver.tier == SolverTier.Tier4 && newStake < 10000 * 10**18) {
            revert("Cannot go below Tier 4 minimum (10000 mUSD)");
        }

        solver.stakedAmount = newStake;
        require(mUSD.transfer(msg.sender, _amount), "Transfer failed");
        emit StakeUpdated(msg.sender, solver.stakedAmount);
    }

    function deactivate() external {
        require(solvers[msg.sender].isActive, "Not active");
        solvers[msg.sender].isActive = false;
        emit SolverDeactivated(msg.sender);
    }

    function recordSuccess(address _solver, uint256 _volume) external onlyOwner {
        require(solvers[_solver].isActive, "Not active");
        solvers[_solver].successfulPayments++;
        solvers[_solver].totalVolume = solvers[_solver].totalVolume.add(_volume);
        emit SuccessRecorded(_solver, _volume);
    }

    function recordFailure(address _solver) external onlyOwner {
        require(solvers[_solver].isActive, "Not active");
        solvers[_solver].failedPayments++;
        emit FailureRecorded(_solver);
    }

    function getSolver(address _solver) 
        external 
        view 
        returns (Solver memory) 
    {
        return solvers[_solver];
    }

    function isActiveSolver(address _solver) 
        external 
        view 
        returns (bool) 
    {
        Solver memory solver = solvers[_solver];
        if (!solver.isActive) return false;
        
        // All tiers are active (including free tier with 0 stake)
        return true;
    }

    function checkMonthlyLimit(address _solver, uint256 _amountINR) 
        external 
        view 
        returns (bool) 
    {
        Solver memory solver = solvers[_solver];
        
        // Reset monthly volume if new month (30 days)
        uint256 currentMonth = block.timestamp / (30 * 1 days);
        uint256 solverMonth = solver.monthStartTimestamp / (30 * 1 days);
        
        if (currentMonth > solverMonth) {
            return true; // New month, limit resets
        }
        
        return (solver.currentMonthVolume + _amountINR) <= solver.monthlyVolumeLimit;
    }

    function updateMonthlyVolume(address _solver, uint256 _amountINR) external onlyOwner {
        Solver storage solver = solvers[_solver];
        
        // Reset if new month (30 days)
        uint256 currentMonth = block.timestamp / (30 * 1 days);
        uint256 solverMonth = solver.monthStartTimestamp / (30 * 1 days);
        
        if (currentMonth > solverMonth) {
            solver.currentMonthVolume = 0;
            solver.monthStartTimestamp = block.timestamp;
        }
        
        solver.currentMonthVolume = solver.currentMonthVolume.add(_amountINR);
    }

    function getSuccessRate(address _solver) 
        external 
        view 
        returns (uint256) 
    {
        Solver memory solver = solvers[_solver];
        uint256 total = solver.successfulPayments.add(solver.failedPayments);
        if (total == 0) return 10000;
        return solver.successfulPayments.mul(10000).div(total);
    }

    function getActiveSolvers() 
        external 
        view 
        returns (address[] memory) 
    {
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < solverList.length; i++) {
            if (this.isActiveSolver(solverList[i])) {
                activeCount++;
            }
        }

        address[] memory active = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < solverList.length; i++) {
            if (this.isActiveSolver(solverList[i])) {
                active[index] = solverList[i];
                index++;
            }
        }

        return active;
    }

    function getSolversInLocation(string memory _location) 
        external 
        view 
        returns (address[] memory) 
    {
        address[] memory locationSolvers = solversByLocation[_location];
        uint256 activeCount = 0;

        for (uint256 i = 0; i < locationSolvers.length; i++) {
            if (this.isActiveSolver(locationSolvers[i])) {
                activeCount++;
            }
        }

        address[] memory active = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < locationSolvers.length; i++) {
            if (this.isActiveSolver(locationSolvers[i])) {
                active[index] = locationSolvers[i];
                index++;
            }
        }

        return active;
    }
}

