import { checkQuerySafetyLocal } from "./src/services/localSafety.js";

const educationalTests = [
    "history of torture",
    "ethical hacking tutorial",
    "cybersecurity fundamentals",
    "malware analysis",
    "anatomy lecture",
    "reproductive biology"
];

const unsafeTests = [
    "watch torture videos",
    "credit card hack",
    "pipe bomb tutorial",
    "leaked nudes",
    "wifi hacking tool",
    "malware download"
];

const typoTests = [
    "bomp making",
    "free prn",
    "how to make a b0mb",
    "creedit caard hack"
];

console.log("=== RUNNING SAFETY MODULE TESTS ===");
let passed = true;

console.log("\n--- Educational Queries (Should be ALLOW or REVIEW, not BLOCK) ---");
for (const query of educationalTests) {
    const result = checkQuerySafetyLocal(query);
    console.log(`Query: "${query}" -> Decision: ${result.decision}, Score: ${result.riskScore}, Blocked: ${result.blocked}`);
    if (result.blocked) {
        console.error(`❌ FAILED: "${query}" was blocked!`);
        passed = false;
    } else {
        console.log(`✅ PASSED`);
    }
}

console.log("\n--- Unsafe Queries (Should be BLOCK) ---");
for (const query of unsafeTests) {
    const result = checkQuerySafetyLocal(query);
    console.log(`Query: "${query}" -> Decision: ${result.decision}, Score: ${result.riskScore}, Blocked: ${result.blocked}, Category: ${result.matchedCategory}`);
    if (!result.blocked) {
        console.error(`❌ FAILED: "${query}" was NOT blocked!`);
        passed = false;
    } else {
        console.log(`✅ PASSED`);
    }
}

console.log("\n--- Obfuscation / Typo Tolerance Queries (Should be BLOCK) ---");
for (const query of typoTests) {
    const result = checkQuerySafetyLocal(query);
    console.log(`Query: "${query}" -> Decision: ${result.decision}, Score: ${result.riskScore}, Blocked: ${result.blocked}, Category: ${result.matchedCategory}`);
    if (!result.blocked) {
        console.error(`❌ FAILED: typo query "${query}" was NOT blocked!`);
        passed = false;
    } else {
        console.log(`✅ PASSED`);
    }
}

console.log("\n==================================");
if (passed) {
    console.log("🏆 ALL TESTS PASSED SUCCESSFULLY!");
} else {
    console.error("💥 SOME TESTS FAILED!");
    process.exit(1);
}
