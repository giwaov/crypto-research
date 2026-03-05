export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// Large question pool - quiz will randomly select 20 questions from this pool
export const questionPool: Question[] = [
  // === CORE CONCEPTS ===
  {
    id: 1,
    question: "What type of blockchain technology is Miden?",
    options: [
      "A layer-1 proof-of-stake blockchain",
      "A zero-knowledge rollup",
      "A sidechain",
      "A state channel network"
    ],
    correctAnswer: 1,
    explanation: "Miden is a zero-knowledge rollup for high-throughput, private applications, secured by Ethereum."
  },
  {
    id: 2,
    question: "Which layer-1 blockchain provides security for Miden?",
    options: [
      "Solana",
      "Polygon",
      "Ethereum",
      "Avalanche"
    ],
    correctAnswer: 2,
    explanation: "Miden is settled on Ethereum with validity proofs via the Agglayer."
  },
  {
    id: 3,
    question: "What architectural model does Miden use for accounts?",
    options: [
      "Global state machine model",
      "Actor model",
      "UTXO model only",
      "Sharding model"
    ],
    correctAnswer: 1,
    explanation: "Miden uses an actor model where each account is an independent state machine that executes transactions locally."
  },
  {
    id: 4,
    question: "Where are Miden transactions executed and proven?",
    options: [
      "On the main network nodes",
      "On Ethereum mainnet",
      "Client-side (locally on user devices)",
      "On dedicated prover nodes"
    ],
    correctAnswer: 2,
    explanation: "Transactions are executed and proven locally on user devices, enabling parallel processing and lower fees."
  },
  {
    id: 5,
    question: "What is the primary benefit of client-side execution in Miden?",
    options: [
      "Lower security",
      "Parallel processing and lower fees",
      "Faster centralized processing",
      "Simpler smart contracts"
    ],
    correctAnswer: 1,
    explanation: "Client-side execution enables parallel processing across users and lower fees since the network doesn't execute transactions."
  },
  {
    id: 6,
    question: "What makes Miden different from traditional blockchains?",
    options: [
      "It uses proof-of-work",
      "Privacy by default with cryptographic commitments",
      "All data is always public",
      "It has no smart contracts"
    ],
    correctAnswer: 1,
    explanation: "Miden provides privacy by default - accounts and notes are private, with the network only storing cryptographic commitments."
  },
  // === NOTES ===
  {
    id: 7,
    question: "In Miden, what are 'Notes'?",
    options: [
      "Documentation comments in code",
      "Programmable messages that transfer assets between accounts",
      "Transaction receipts",
      "Error messages"
    ],
    correctAnswer: 1,
    explanation: "Notes are programmable messages that transfer assets between accounts and can contain arbitrary logic."
  },
  {
    id: 8,
    question: "What can notes contain in Miden?",
    options: [
      "Only fungible tokens",
      "Script, inputs, assets, and metadata",
      "Only text data",
      "Only NFTs"
    ],
    correctAnswer: 1,
    explanation: "Notes contain a script (code executed when consumed), inputs (public data), assets (tokens transferred), and metadata."
  },
  {
    id: 9,
    question: "What privacy options do notes have in Miden?",
    options: [
      "Notes are always public",
      "Notes are always private",
      "Notes can be public or private",
      "Privacy is determined by the network"
    ],
    correctAnswer: 2,
    explanation: "Notes can be public (all data on-chain) or private (only a commitment stored). Private notes require off-chain communication."
  },
  {
    id: 10,
    question: "What is a 'Note script' in Miden?",
    options: [
      "A JavaScript file",
      "A program defining rules for note consumption",
      "A database query",
      "A network protocol"
    ],
    correctAnswer: 1,
    explanation: "A Note script is a program that defines the rules and conditions under which a note can be consumed."
  },
  {
    id: 11,
    question: "What is a 'Note tag' used for in Miden?",
    options: [
      "Debugging purposes",
      "Additional filtering and discovery capabilities",
      "Storing large files",
      "Network routing"
    ],
    correctAnswer: 1,
    explanation: "A Note tag is an identifier or metadata that provides additional filtering capabilities for note discovery."
  },
  {
    id: 12,
    question: "What happens to notes when they are 'consumed' in Miden?",
    options: [
      "They are archived on IPFS",
      "Their nullifier is recorded to prevent double-spending",
      "They are transferred to another account",
      "They are converted to tokens"
    ],
    correctAnswer: 1,
    explanation: "When notes are consumed, their nullifier is recorded in the Nullifiers database to prevent double-spending."
  },
  {
    id: 13,
    question: "What are 'input notes' in a Miden transaction?",
    options: [
      "Notes created by the transaction",
      "Notes consumed (spent) by the transaction",
      "Notes waiting in queue",
      "Notes that failed validation"
    ],
    correctAnswer: 1,
    explanation: "Input notes are notes that are consumed (spent) by the transaction, as opposed to output notes which are newly created."
  },
  {
    id: 14,
    question: "What are 'output notes' in a Miden transaction?",
    options: [
      "Notes consumed by the transaction",
      "New notes created by the transaction",
      "Notes that were rejected",
      "Notes pending approval"
    ],
    correctAnswer: 1,
    explanation: "Output notes are new notes created by the transaction, which can then be consumed by other transactions."
  },
  // === NULLIFIERS ===
  {
    id: 15,
    question: "What is a 'Nullifier' in Miden?",
    options: [
      "A type of smart contract",
      "A cryptographic commitment that marks a note as spent",
      "A wallet address",
      "A transaction fee"
    ],
    correctAnswer: 1,
    explanation: "A nullifier is a cryptographic commitment that marks a note as spent, preventing double-spending."
  },
  {
    id: 16,
    question: "Why are nullifiers important in Miden?",
    options: [
      "They speed up transactions",
      "They prevent double-spending of notes",
      "They reduce storage costs",
      "They improve user interface"
    ],
    correctAnswer: 1,
    explanation: "Nullifiers prevent double-spending by creating a unique marker for each spent note that can be checked."
  },
  {
    id: 17,
    question: "Where is the nullifier recorded when a note is consumed?",
    options: [
      "In the user's wallet",
      "In the Nullifiers database (Sparse Merkle Tree)",
      "On Ethereum mainnet",
      "In local storage only"
    ],
    correctAnswer: 1,
    explanation: "Nullifiers are recorded in the Nullifiers database, which uses a Sparse Merkle Tree to track consumed notes."
  },
  // === ACCOUNTS ===
  {
    id: 18,
    question: "How many storage slots can a Miden account have?",
    options: [
      "Up to 64 slots",
      "Up to 128 slots",
      "Up to 256 slots",
      "Unlimited slots"
    ],
    correctAnswer: 2,
    explanation: "Account storage is a key-value store with up to 256 slots for persistent data."
  },
  {
    id: 19,
    question: "What is the purpose of account 'components' in Miden?",
    options: [
      "To store transaction history",
      "Modular building blocks that add capabilities to accounts",
      "To verify proofs",
      "To manage network connections"
    ],
    correctAnswer: 1,
    explanation: "Components are modular building blocks that add capabilities like wallet functionality, token standards, or custom logic."
  },
  {
    id: 20,
    question: "What is an 'AccountId' in Miden?",
    options: [
      "A random number",
      "A value that uniquely identifies each account",
      "The account's password",
      "A temporary session token"
    ],
    correctAnswer: 1,
    explanation: "The AccountId is a value that uniquely identifies each account in Miden."
  },
  {
    id: 21,
    question: "What is the 'AccountCode' in Miden?",
    options: [
      "A secret key",
      "The executable code associated with an account",
      "A backup phrase",
      "The account balance"
    ],
    correctAnswer: 1,
    explanation: "AccountCode represents the executable code associated with an account - similar to smart contract code."
  },
  {
    id: 22,
    question: "What is the 'AssetVault' in a Miden account?",
    options: [
      "A backup storage",
      "A container for managing assets within accounts",
      "A hardware wallet",
      "An exchange interface"
    ],
    correctAnswer: 1,
    explanation: "The AssetVault is used for managing assets within accounts, providing storage and transfer capabilities."
  },
  {
    id: 23,
    question: "What does 'Account nonce' prevent in Miden?",
    options: [
      "High gas fees",
      "Replay attacks",
      "Slow transactions",
      "Memory leaks"
    ],
    correctAnswer: 1,
    explanation: "The nonce is a monotonically increasing counter that prevents replay attacks by ensuring each transaction is unique."
  },
  {
    id: 24,
    question: "How many transactions can a Miden account execute simultaneously?",
    options: [
      "One transaction at a time (single-account model)",
      "Up to 10 concurrent transactions",
      "Unlimited transactions",
      "Depends on network congestion"
    ],
    correctAnswer: 0,
    explanation: "Miden uses a single-account model where each transaction operates on one account, avoiding state contention."
  },
  {
    id: 25,
    question: "What type of identifier is an AccountId in Miden?",
    options: [
      "A 32-bit integer",
      "A 64-bit identifier",
      "A 256-bit hash",
      "A string"
    ],
    correctAnswer: 1,
    explanation: "AccountId is a unique 64-bit identifier derived from the initial code and storage of the account."
  },
  // === MIDEN VM ===
  {
    id: 26,
    question: "What type of proofs does the Miden VM use?",
    options: [
      "SNARK proofs",
      "STARK proofs",
      "Bulletproofs",
      "Groth16 proofs"
    ],
    correctAnswer: 1,
    explanation: "The Miden VM is a STARK-based virtual machine optimized for zero-knowledge proof generation."
  },
  {
    id: 27,
    question: "What is a 'Felt' in Miden?",
    options: [
      "A type of smart contract",
      "A field element used for cryptographic operations",
      "A transaction type",
      "A wallet format"
    ],
    correctAnswer: 1,
    explanation: "A Felt (Field Element) is a data type representing an element in the finite field used in Miden."
  },
  {
    id: 28,
    question: "What is Miden Assembly?",
    options: [
      "A high-level programming language",
      "A graphical development environment",
      "A low-level assembly language optimized for ZK proof generation",
      "A testing framework"
    ],
    correctAnswer: 2,
    explanation: "Miden Assembly is a low-level programming language with specialized instructions optimized for ZK proof generation."
  },
  {
    id: 29,
    question: "What is a 'Word' in Miden's context?",
    options: [
      "A single byte of data",
      "A 32-bit integer",
      "A data structure composed of four Felts",
      "A string type"
    ],
    correctAnswer: 2,
    explanation: "A Word is the basic unit of computation and storage in Miden, composed of four Felts."
  },
  {
    id: 30,
    question: "What is the 'Kernel' in Miden VM?",
    options: [
      "The user interface component",
      "A network routing module",
      "A fundamental module providing core functionality and security",
      "The transaction fee calculator"
    ],
    correctAnswer: 2,
    explanation: "The Kernel is a fundamental module providing core functionality and security guarantees for the protocol."
  },
  {
    id: 31,
    question: "What is a 'Prover' in Miden?",
    options: [
      "A user who tests the network",
      "A component that generates zero-knowledge proofs",
      "A database administrator",
      "A consensus mechanism"
    ],
    correctAnswer: 1,
    explanation: "A Prover generates zero-knowledge proofs that attest to the correctness of execution without revealing data."
  },
  {
    id: 32,
    question: "What advantage do STARK proofs have over SNARKs?",
    options: [
      "Smaller proof size",
      "No trusted setup required",
      "Faster verification",
      "Lower security"
    ],
    correctAnswer: 1,
    explanation: "STARK proofs don't require a trusted setup, making them more transparent and secure in that regard."
  },
  // === DATA STRUCTURES ===
  {
    id: 33,
    question: "What data structure does Miden use for the Accounts database?",
    options: [
      "Hash table",
      "Linked list",
      "Sparse Merkle Tree",
      "Binary tree"
    ],
    correctAnswer: 2,
    explanation: "The Accounts database uses a Sparse Merkle Tree that maps account IDs to state commitments."
  },
  {
    id: 34,
    question: "What data structure stores notes in Miden?",
    options: [
      "Sparse Merkle Tree",
      "Hash table",
      "Merkle Mountain Range",
      "Patricia Trie"
    ],
    correctAnswer: 2,
    explanation: "Notes are stored in a Merkle Mountain Range, an append-only log of created notes."
  },
  {
    id: 35,
    question: "How many core databases does Miden maintain?",
    options: [
      "One",
      "Two",
      "Three",
      "Four"
    ],
    correctAnswer: 2,
    explanation: "Miden maintains three core databases: Accounts, Notes (Merkle Mountain Range), and Nullifiers."
  },
  {
    id: 36,
    question: "Why does Miden use a Sparse Merkle Tree for accounts?",
    options: [
      "For faster writes",
      "For efficient state proofs and commitment storage",
      "For cheaper storage",
      "For backward compatibility"
    ],
    correctAnswer: 1,
    explanation: "Sparse Merkle Trees enable efficient state proofs and allow storing only commitments rather than full data."
  },
  // === TRANSACTIONS ===
  {
    id: 37,
    question: "What does a Miden transaction do?",
    options: [
      "Only transfers tokens",
      "Consumes notes, updates account state, and produces new notes",
      "Only creates new accounts",
      "Only generates proofs"
    ],
    correctAnswer: 1,
    explanation: "Transactions consume input notes, execute account code, update state, and produce output notes."
  },
  {
    id: 38,
    question: "What is a 'Batch' in Miden?",
    options: [
      "A group of users",
      "Multiple transactions grouped together for block aggregation",
      "A storage unit",
      "A type of token"
    ],
    correctAnswer: 1,
    explanation: "A Batch groups multiple transactions together to be aggregated into blocks, improving throughput."
  },
  {
    id: 39,
    question: "What is a 'Delta' in Miden?",
    options: [
      "A Greek letter only",
      "The changes between two states",
      "A type of note",
      "A wallet feature"
    ],
    correctAnswer: 1,
    explanation: "A Delta represents the changes between two states - applying a delta to state 's' results in state 's prime'."
  },
  {
    id: 40,
    question: "What is a 'Block' in Miden?",
    options: [
      "A storage unit",
      "A data structure grouping batches to form blockchain state",
      "A type of token",
      "A user interface element"
    ],
    correctAnswer: 1,
    explanation: "A Block groups multiple batches together and forms the blockchain's state progression."
  },
  // === PRIVACY & SECURITY ===
  {
    id: 41,
    question: "How does Miden achieve privacy by default?",
    options: [
      "By encrypting all data with AES",
      "By storing only cryptographic commitments on-chain",
      "By using VPNs",
      "By deleting old data"
    ],
    correctAnswer: 1,
    explanation: "Miden stores only cryptographic commitments on-chain; full data remains with users for privacy."
  },
  {
    id: 42,
    question: "What is required for private notes in Miden?",
    options: [
      "Special hardware",
      "Off-chain communication between sender and recipient",
      "Government approval",
      "Higher fees"
    ],
    correctAnswer: 1,
    explanation: "Private notes store only a commitment on-chain, requiring off-chain communication to share note details."
  },
  {
    id: 43,
    question: "What does 'validity proof' mean in Miden?",
    options: [
      "A proof that a user is real",
      "A ZK proof that a state transition is valid",
      "A proof of identity",
      "A proof of payment"
    ],
    correctAnswer: 1,
    explanation: "Validity proofs are zero-knowledge proofs that attest to valid state transitions without revealing data."
  },
  // === NETWORK & INFRASTRUCTURE ===
  {
    id: 44,
    question: "What bridging technology does Miden use to connect to Ethereum?",
    options: [
      "Polygon Bridge",
      "Wormhole",
      "Agglayer",
      "LayerZero"
    ],
    correctAnswer: 2,
    explanation: "Miden uses the Agglayer for settlement and validity proofs on Ethereum."
  },
  {
    id: 45,
    question: "What version of Miden is approaching mainnet readiness for 2026?",
    options: [
      "v0.10",
      "v0.11",
      "v0.13",
      "v1.0"
    ],
    correctAnswer: 2,
    explanation: "Miden is currently on v0.13, approaching mainnet readiness for the 2026 launch."
  },
  {
    id: 46,
    question: "What toolchain installer does Miden use?",
    options: [
      "npm install",
      "midenup",
      "rustup",
      "brew install"
    ],
    correctAnswer: 1,
    explanation: "Miden uses the midenup toolchain for setting up the development environment."
  },
  {
    id: 47,
    question: "What company/organization is building Miden?",
    options: [
      "Ethereum Foundation",
      "Polygon Labs",
      "Consensys",
      "Solana Labs"
    ],
    correctAnswer: 1,
    explanation: "Miden is being built by Polygon Labs as part of the Polygon ecosystem."
  },
  // === BENEFITS & USE CASES ===
  {
    id: 48,
    question: "What types of applications is Miden designed for?",
    options: [
      "Gaming only",
      "Payments, DeFi, and asset management",
      "Social media only",
      "File storage only"
    ],
    correctAnswer: 1,
    explanation: "Miden is designed for payments, DeFi, and asset management apps with privacy and high throughput."
  },
  {
    id: 49,
    question: "Why does Miden enable parallel processing?",
    options: [
      "It uses multiple CPUs",
      "Single-account transactions don't contend for shared state",
      "It has faster internet",
      "It uses quantum computing"
    ],
    correctAnswer: 1,
    explanation: "Since transactions operate on single accounts, they don't contend for shared state, enabling parallelism."
  },
  {
    id: 50,
    question: "What is the benefit of proof aggregation in Miden?",
    options: [
      "Larger proofs",
      "Reduced on-chain verification costs",
      "Slower transactions",
      "Higher fees"
    ],
    correctAnswer: 1,
    explanation: "Proof aggregation combines multiple proofs into one, reducing on-chain verification costs."
  },
  // === ADVANCED CONCEPTS ===
  {
    id: 51,
    question: "What is 'programmable everything' in Miden?",
    options: [
      "Only fungible tokens are programmable",
      "Accounts are smart contracts and notes can contain arbitrary logic",
      "Only network nodes are programmable",
      "Users can program fees"
    ],
    correctAnswer: 1,
    explanation: "In Miden, accounts are smart contracts and notes can contain arbitrary logic - everything is programmable."
  },
  {
    id: 52,
    question: "What is an 'Account builder' in Miden?",
    options: [
      "A person who creates accounts",
      "A structured way to create accounts with specific properties",
      "A UI component",
      "A testing tool"
    ],
    correctAnswer: 1,
    explanation: "Account builder provides a structured way to create new accounts with specific properties and initial state."
  },
  {
    id: 53,
    question: "What is 'AccountStorage' in Miden?",
    options: [
      "Cloud storage",
      "A key-value store associated with an account",
      "External hard drive",
      "Browser cache"
    ],
    correctAnswer: 1,
    explanation: "AccountStorage is a key-value store of up to 256 storage slots associated with an account."
  },
  {
    id: 54,
    question: "What is an 'Asset' in the Miden context?",
    options: [
      "Physical property",
      "A digital resource with value that can be owned and transferred",
      "A file type",
      "A network node"
    ],
    correctAnswer: 1,
    explanation: "An Asset represents a digital resource with value that can be owned, transferred, and managed on Miden."
  },
  {
    id: 55,
    question: "What types of assets can Miden handle?",
    options: [
      "Only Bitcoin",
      "Fungible and non-fungible assets",
      "Only stablecoins",
      "Only NFTs"
    ],
    correctAnswer: 1,
    explanation: "Miden's vault can hold both fungible and non-fungible assets."
  },
  {
    id: 56,
    question: "What is the purpose of 'Note ID' in Miden?",
    options: [
      "To track user identity",
      "To uniquely identify each note",
      "To calculate fees",
      "To route network traffic"
    ],
    correctAnswer: 1,
    explanation: "Note ID is a unique identifier assigned to each note to distinguish it from others."
  },
  {
    id: 57,
    question: "What happens during 'local execution' in Miden?",
    options: [
      "The network executes your code",
      "Users execute transactions on their devices and generate proofs",
      "Smart contracts run on Ethereum",
      "Validators run the code"
    ],
    correctAnswer: 1,
    explanation: "During local execution, users execute transactions on their devices and generate STARK proofs."
  },
  {
    id: 58,
    question: "What verifies transactions in Miden after local execution?",
    options: [
      "Miners",
      "The network verifies proofs and updates state commitments",
      "Users vote on validity",
      "Random selection"
    ],
    correctAnswer: 1,
    explanation: "The network verifies proofs, updates state commitments, and makes notes available after local execution."
  },
  {
    id: 59,
    question: "How are accounts analogous to in traditional blockchains?",
    options: [
      "Miners",
      "Smart contracts",
      "Validators",
      "Oracles"
    ],
    correctAnswer: 1,
    explanation: "Miden accounts are analogous to smart contracts - they hold assets and execute custom logic."
  },
  {
    id: 60,
    question: "What model does Miden's note system resemble?",
    options: [
      "Account-based model only",
      "UTXO-like model",
      "Proof-of-stake model",
      "Sharding model"
    ],
    correctAnswer: 1,
    explanation: "Miden's note system is designed around a UTXO-like model where notes are consumed and created."
  }
];

// For backward compatibility
export const quizQuestions = questionPool;
