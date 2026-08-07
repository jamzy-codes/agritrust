// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IRoleRegistry {
    enum Role { NONE, FARMER, INSPECTOR, DISTRIBUTOR, REGULATOR }
    function hasRole(address account, Role role) external view returns (bool);
}