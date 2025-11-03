// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/SolverRegistry.sol";
import "../src/MUSDPaymentFactory.sol";

contract DeployScript is Script {
    address constant MUSD_TESTNET = 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503; // Official mUSD address

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("========================================");
        console.log("Deploying to Mezo L2 Testnet");
        console.log("Chain ID: 31611");
        console.log("Network: Mezo Testnet");
        console.log("mUSD: %s", MUSD_TESTNET);
        console.log("Deployer: %s", deployer);
        console.log("========================================");

        vm.startBroadcast(deployerPrivateKey);

        console.log("\n1. Deploying SolverRegistry...");
        SolverRegistry solverRegistry = new SolverRegistry(MUSD_TESTNET);
        console.log("   Address: %s", address(solverRegistry));

        console.log("\n2. Deploying MUSDPaymentFactory...");
        MUSDPaymentFactory paymentFactory = new MUSDPaymentFactory(MUSD_TESTNET);
        console.log("   Address: %s", address(paymentFactory));

        console.log("\n3. Configuring...");
        paymentFactory.setSolverRegistry(address(solverRegistry));
        console.log("   SolverRegistry linked");

        address matchingServiceAddress = vm.envAddress("MATCHING_SERVICE_ADDRESS");
        paymentFactory.setMatchingService(matchingServiceAddress);
        console.log("   Matching Service authorized: %s", matchingServiceAddress);

        vm.stopBroadcast();

        console.log("\n========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("SolverRegistry: %s", address(solverRegistry));
        console.log("PaymentFactory: %s", address(paymentFactory));
        console.log("mUSD: %s", MUSD_TESTNET);
        console.log("\nAdd to frontend .env.local:");
        console.log("NEXT_PUBLIC_MUSD_ADDRESS=%s", MUSD_TESTNET);
        console.log("NEXT_PUBLIC_PAYMENT_FACTORY_ADDRESS=%s", address(paymentFactory));
        console.log("NEXT_PUBLIC_SOLVER_REGISTRY_ADDRESS=%s", address(solverRegistry));
        console.log("\nAdd to backend .env:");
        console.log("PAYMENT_FACTORY_ADDRESS=%s", address(paymentFactory));
        console.log("SOLVER_REGISTRY_ADDRESS=%s", address(solverRegistry));
        console.log("========================================");
    }
}

