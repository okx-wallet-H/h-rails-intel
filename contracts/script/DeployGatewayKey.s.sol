// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {GatewayKey} from "../src/GatewayKey.sol";

contract DeployGatewayKey is Script {
    address constant USDG = 0x4ae46a509F6b1D9056937BA4500cb143933D2dc8;
    address constant USDT = 0x779Ded0c9e1022225f8E0630b35a9b54bE713736;

    function run() external returns (address deployed) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        GatewayKey gateway = new GatewayKey(USDG, USDT);
        deployed = address(gateway);

        console2.log("GatewayKey deployed at:", deployed);

        vm.stopBroadcast();
    }
}