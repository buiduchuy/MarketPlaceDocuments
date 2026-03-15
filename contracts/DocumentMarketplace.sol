// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StudyToken.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DocumentMarketplace is ReentrancyGuard {

    StudyToken public token;
    uint public documentCount;

    struct Document {
        uint id;
        string title;
        string description;
        uint price;
        string ipfsHash;
        address author;
    }

    mapping(uint => Document) public documents;
    mapping(uint => mapping(address => bool)) public hasAccess;
    // --- Khai báo Events ở đây ---
    event DocumentUploaded(uint id, string title, address author, uint price);
    event DocumentPurchased(uint id, address buyer, address author);

    constructor(address tokenAddress) {
        token = StudyToken(tokenAddress);
    }

    // Hàm uploadDocument (Chỉ giữ lại 1 bản và có thêm Emit Event)
    function uploadDocument(
        string memory title,
        string memory description,
        uint price,
        string memory ipfsHash
    ) public {
        documentCount++;

        documents[documentCount] = Document(
            documentCount,
            title,
            description,
            price,
            ipfsHash,
            msg.sender
        );

        emit DocumentUploaded(documentCount, title, msg.sender, price);
    }

    // Hàm buyDocument (Chỉ giữ lại 1 bản và có thêm Emit Event)
        function buyDocument(uint id) public nonReentrant {
    Document memory doc = documents[id];
    require(doc.id > 0 && doc.id <= documentCount, "Invalid document");
    require(!hasAccess[id][msg.sender], "Already owned"); // Tránh mua 2 lần

    token.transferFrom(msg.sender, doc.author, doc.price);
    
    // Đánh dấu người dùng đã mua
    hasAccess[id][msg.sender] = true;

    emit DocumentPurchased(id, msg.sender, doc.author);
}

    function getAllDocuments() public view returns (Document[] memory) {
        Document[] memory docs = new Document[](documentCount);
        for(uint i = 1; i <= documentCount; i++){
            docs[i-1] = documents[i];
        }
        return docs;
    }
}