// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract MUSDPaymentFactory is ReentrancyGuard, Ownable {
    using SafeMath for uint256;

    uint256 public constant PAYMENT_EXPIRY_TIME = 15 minutes;
    uint256 public constant AUTO_COMPLETE_TIME = 25 minutes;

    IERC20 public immutable mUSD;
    address public solverRegistry;
    address public matchingService;
    uint256 public platformFeePercent = 10; // Default fallback (now calculated dynamically based on solver tier)
    uint256 public paymentCounter;

    struct Payment {
        address user;
        uint256 amountMUSD;
        uint256 amountINR;
        string merchantVPA;
        string location;
        uint256 createdAt;
        uint256 expiresAt;
        address assignedSolver;
        PaymentStatus status;
        string upiTxnId;
    }

    enum PaymentStatus {
        Pending,      // 0
        Matched,      // 1
        Processing,   // 2
        Completed,    // 3
        Cancelled,    // 4
        Expired       // 5
    }

    mapping(bytes32 => Payment) public payments;
    mapping(address => bytes32[]) public userPayments;
    mapping(bytes32 => bool) public paymentSettled;

    event PaymentCreated(
        bytes32 indexed paymentId,
        address indexed user,
        uint256 amountMUSD,
        uint256 amountINR,
        string location,
        uint256 expiresAt
    );

    event SolverMatched(
        bytes32 indexed paymentId,
        address indexed solver,
        uint256 timestamp
    );

    event PaymentProofSubmitted(
        bytes32 indexed paymentId,
        address indexed solver,
        string upiTxnId
    );

    event PaymentCompleted(
        bytes32 indexed paymentId,
        address indexed user,
        address indexed solver,
        uint256 solverAmount,
        uint256 platformFee
    );

    event PaymentCancelled(
        bytes32 indexed paymentId,
        string reason
    );

    modifier onlyMatchingService() {
        require(
            msg.sender == matchingService || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }

    modifier validPayment(bytes32 _paymentId) {
        require(payments[_paymentId].user != address(0), "Payment not found");
        _;
    }

    constructor(address _mUSD) {
        require(_mUSD != address(0), "Invalid mUSD address");
        mUSD = IERC20(_mUSD);
    }

    function setMatchingService(address _service) external onlyOwner {
        require(_service != address(0), "Invalid address");
        matchingService = _service;
    }

    function setSolverRegistry(address _registry) external onlyOwner {
        require(_registry != address(0), "Invalid address");
        solverRegistry = _registry;
    }

    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 100, "Fee too high");
        platformFeePercent = _fee;
    }

    function withdrawFees(uint256 _amount) external onlyOwner nonReentrant {
        require(_amount > 0, "Invalid amount");
        require(mUSD.transfer(owner(), _amount), "Transfer failed");
    }

    function createPayment(
        uint256 _amountMUSD,
        uint256 _amountINR,
        string memory _merchantVPA,
        string memory _location
    ) external nonReentrant returns (bytes32) {
        require(_amountMUSD > 0, "Amount must be positive");
        require(_amountINR > 0, "INR amount must be positive");
        require(bytes(_merchantVPA).length > 0, "VPA required");
        require(bytes(_location).length > 0, "Location required");

        require(
            mUSD.transferFrom(msg.sender, address(this), _amountMUSD),
            "Transfer failed"
        );

        bytes32 paymentId = keccak256(
            abi.encodePacked(msg.sender, paymentCounter++, block.timestamp)
        );

        payments[paymentId] = Payment({
            user: msg.sender,
            amountMUSD: _amountMUSD,
            amountINR: _amountINR,
            merchantVPA: _merchantVPA,
            location: _location,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + PAYMENT_EXPIRY_TIME,
            assignedSolver: address(0),
            status: PaymentStatus.Pending,
            upiTxnId: ""
        });

        userPayments[msg.sender].push(paymentId);

        emit PaymentCreated(
            paymentId,
            msg.sender,
            _amountMUSD,
            _amountINR,
            _location,
            block.timestamp + PAYMENT_EXPIRY_TIME
        );

        return paymentId;
    }

    function cancelPayment(bytes32 _paymentId) 
        external 
        nonReentrant 
        validPayment(_paymentId) 
    {
        Payment storage payment = payments[_paymentId];
        require(msg.sender == payment.user, "Not payment creator");

        bool expired = block.timestamp >= payment.expiresAt;

        // Only allow cancel if:
        // 1. Status is Pending (no solver involved yet), OR
        // 2. Status is Matched AND time expired (solver assigned but didn't act)
        // NEVER allow cancel if Processing (solver submitted proof) or Completed
        require(
            payment.status == PaymentStatus.Pending || 
            (payment.status == PaymentStatus.Matched && expired),
            "Cannot cancel - payment in progress or completed"
        );

        require(
            mUSD.transfer(payment.user, payment.amountMUSD),
            "Refund failed"
        );

        payment.status = expired 
            ? PaymentStatus.Expired 
            : PaymentStatus.Cancelled;

        string memory reason = expired 
            ? "Expired" 
            : "Cancelled";

        emit PaymentCancelled(_paymentId, reason);
    }

    function submitPaymentProof(
        bytes32 _paymentId,
        string memory _upiTxnId
    ) external validPayment(_paymentId) {
        Payment storage payment = payments[_paymentId];
        require(
            msg.sender == payment.assignedSolver,
            "Not assigned solver"
        );
        require(
            payment.status == PaymentStatus.Matched,
            "Not matched"
        );
        require(bytes(_upiTxnId).length > 0, "UPI ID required");

        payment.upiTxnId = _upiTxnId;
        payment.status = PaymentStatus.Processing;

        emit PaymentProofSubmitted(_paymentId, msg.sender, _upiTxnId);
    }

    function completePayment(bytes32 _paymentId) 
        external 
        nonReentrant 
        validPayment(_paymentId) 
    {
        Payment storage payment = payments[_paymentId];
        require(
            payment.status == PaymentStatus.Processing,
            "Not processing"
        );

        bool authorized = (
            msg.sender == payment.user ||
            msg.sender == owner() ||
            block.timestamp > payment.createdAt + AUTO_COMPLETE_TIME
        );
        require(authorized, "Not authorized");

        require(!paymentSettled[_paymentId], "Already settled");
        paymentSettled[_paymentId] = true;

        // Get solver tier to determine platform fee
        uint256 platformFeePercentLocal;
        if (solverRegistry != address(0)) {
            ISolverRegistry.Solver memory solver = ISolverRegistry(solverRegistry).getSolver(payment.assignedSolver);
            // Platform fee: Free/Tier1/Tier2 = 0.20% (20 basis points), Tier3/Tier4 = 0.10% (10 basis points)
            if (solver.tier == ISolverRegistry.SolverTier.Free || solver.tier == ISolverRegistry.SolverTier.Tier1 || solver.tier == ISolverRegistry.SolverTier.Tier2) {
                platformFeePercentLocal = 20; // 0.20%
            } else {
                platformFeePercentLocal = 10; // 0.10%
            }
        } else {
            platformFeePercentLocal = 10; // Default
        }

        uint256 platformFee = payment.amountMUSD.mul(platformFeePercentLocal).div(10000);
        uint256 solverAmount = payment.amountMUSD.sub(platformFee);

        require(
            mUSD.transfer(payment.assignedSolver, solverAmount),
            "Solver transfer failed"
        );

        if (platformFee > 0) {
            require(
                mUSD.transfer(owner(), platformFee),
                "Fee transfer failed"
            );
        }

        payment.status = PaymentStatus.Completed;

        if (solverRegistry != address(0)) {
            ISolverRegistry(solverRegistry).recordSuccess(
                payment.assignedSolver,
                payment.amountMUSD
            );
            ISolverRegistry(solverRegistry).updateMonthlyVolume(
                payment.assignedSolver,
                payment.amountINR
            );
        }

        emit PaymentCompleted(
            _paymentId,
            payment.user,
            payment.assignedSolver,
            solverAmount,
            platformFee
        );
    }

    function assignSolver(
        bytes32 _paymentId,
        address _solver
    ) external onlyMatchingService validPayment(_paymentId) {
        Payment storage payment = payments[_paymentId];
        require(
            payment.status == PaymentStatus.Pending,
            "Not pending"
        );
        require(block.timestamp < payment.expiresAt, "Expired");
        require(_solver != address(0), "Invalid solver");

        if (solverRegistry != address(0)) {
            require(
                ISolverRegistry(solverRegistry).isActiveSolver(_solver),
                "Solver not active"
            );
        }

        payment.assignedSolver = _solver;
        payment.status = PaymentStatus.Matched;

        emit SolverMatched(_paymentId, _solver, block.timestamp);
    }

    function getPayment(bytes32 _paymentId) 
        external 
        view 
        returns (Payment memory) 
    {
        return payments[_paymentId];
    }

    function getUserPayments(address _user) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return userPayments[_user];
    }

    function isExpired(bytes32 _paymentId) 
        external 
        view 
        returns (bool) 
    {
        return block.timestamp >= payments[_paymentId].expiresAt;
    }

    function getContractBalance() external view returns (uint256) {
        return mUSD.balanceOf(address(this));
    }
}

interface ISolverRegistry {
    enum SolverTier {
        Free,
        Tier1,
        Tier2,
        Tier3,
        Tier4
    }

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
        uint256 monthlyVolumeLimit;
        uint256 currentMonthVolume;
        uint256 monthStartTimestamp;
    }

    function isActiveSolver(address solver) external view returns (bool);
    function getSolver(address solver) external view returns (Solver memory);
    function recordSuccess(address solver, uint256 volume) external;
    function recordFailure(address solver) external;
    function updateMonthlyVolume(address solver, uint256 amountINR) external;
}

