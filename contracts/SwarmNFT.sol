// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
contract SwarmNFT is ERC721 { constructor() ERC721('SwarmAgent', 'SWARM') {} function mint(address to, uint256 id) public { _mint(to, id); } }