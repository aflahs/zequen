// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CertificateRegistry {
    struct Certificate {
        address issuer;
        uint256 timestamp;
        string metadata;
        bool exists;
    }

    // Mapping from certificate hash to Certificate record
    mapping(bytes32 => Certificate) private certificates;

    // Mapping from issuer address to their certificate hashes
    mapping(address => bytes32[]) private issuerCertificates;

    // Events
    event CertificateRegistered(
        bytes32 indexed certHash,
        address indexed issuer,
        uint256 timestamp,
        string metadata
    );

    /**
     * Register a certificate hash on the blockchain
     * @param certHash The SHA-256 hash of the canonical certificate data
     * @param metadata Additional metadata (e.g., certificate ID, student info)
     */
    function registerCertificate(bytes32 certHash, string memory metadata) public {
        require(!certificates[certHash].exists, "Certificate hash already registered");

        certificates[certHash] = Certificate({
            issuer: msg.sender,
            timestamp: block.timestamp,
            metadata: metadata,
            exists: true
        });

        issuerCertificates[msg.sender].push(certHash);

        emit CertificateRegistered(certHash, msg.sender, block.timestamp, metadata);
    }

    /**
     * Verify if a certificate hash exists on the blockchain
     * @param certHash The hash to verify
     * @return exists Whether the hash is registered
     * @return issuer The address that registered it
     * @return timestamp When it was registered
     * @return metadata Associated metadata
     */
    function verifyCertificate(bytes32 certHash) public view returns (
        bool exists,
        address issuer,
        uint256 timestamp,
        string memory metadata
    ) {
        Certificate memory cert = certificates[certHash];
        return (cert.exists, cert.issuer, cert.timestamp, cert.metadata);
    }

    /**
     * Get all certificate hashes registered by an issuer
     * @param issuer The wallet address of the issuer
     * @return Array of certificate hashes
     */
    function getCertificatesByIssuer(address issuer) public view returns (bytes32[] memory) {
        return issuerCertificates[issuer];
    }
}
