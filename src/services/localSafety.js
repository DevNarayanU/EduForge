/**
 * Service to manage local query safety checks, risk scoring,
 * typo tolerance, and educational overrides.
 * Runs entirely client-side for immediate feedback.
 * 
 * @typedef {Object} ModerationResult
 * @property {boolean} blocked - True if the query should be blocked (decision === "BLOCK").
 * @property {boolean} allow - Backward compatibility helper (allow === !blocked).
 * @property {"ALLOW" | "REVIEW" | "BLOCK"} decision - The final safety decision.
 * @property {string} reason - Human-readable reason for the decision.
 * @property {number} riskScore - Calculated risk score from 0 (completely safe) to 10 (extremely unsafe).
 * @property {string} matchedCategory - The content category matched ("violence", "sexual", "illegal", "hate", "distraction", "none").
 * @property {string[]} matchedTerms - The specific terms or patterns that triggered the flags.
 * @property {string[]} suggestions - Educational search terms mapping to the matched category to redirect students.
 */

// Zero tolerance configurations
// These patterns will trigger an immediate BLOCK decision (score 10) and bypass educational overrides.
const ZERO_TOLERANCE_RULES = [
    { pattern: /pipe\s*bomb/i, term: "pipe bomb", category: "illegal", reason: "Instructional content for explosive devices." },
    { pattern: /credit\s*card\s*(hack|carding|leak)/i, term: "credit card hack", category: "illegal", reason: "Financial fraud or theft." },
    { pattern: /watch\s+.*torture/i, term: "watch torture", category: "violence", reason: "Graphic real-world violence." },
    { pattern: /leak(ed)?\s+nude/i, term: "leaked nudes", category: "sexual", reason: "Non-consensual explicit content." },
    { pattern: /malware\s+download/i, term: "malware download", category: "illegal", reason: "Malicious software acquisition." },
    { pattern: /wifi\s+hacking\s+tool/i, term: "wifi hacking tool", category: "illegal", reason: "Unauthorized network intrusion utilities." }
];

// Categorized moderation database
const MODERATION_RULES = {
    violence: {
        categoryName: "violence",
        description: "Graphic injuries, physical harm, self-harm, or torture content.",
        keywords: ["torture", "gore", "murder", "cartel", "execution", "violent", "behead", "blood", "kill", "suicide", "self-harm"],
        phrases: ["murder footage", "graphic injury", "violent clips", "torture videos", "how to kill"],
        patterns: [
            /kill\s+(myself|him|her|them|people)/i,
            /suicide\s+(methods|how\s+to)/i,
            /torture\s+videos/i
        ],
        suggestions: ["World History", "Conflict Resolution Studies", "Human Rights Education"]
    },
    sexual: {
        categoryName: "sexual",
        description: "Explicit adult content, pornography, and nudity.",
        keywords: ["porn", "hentai", "nsfw", "fetish", "nude", "nudes", "explicit", "leaked", "sex", "xxx", "erotic", "orgasm", "adult"],
        phrases: ["leaked nudes", "explicit content", "watch porn", "free porn", "adult videos"],
        patterns: [
            /free\s+porn/i,
            /watch\s+porn/i,
            /sex\s+video/i
        ],
        suggestions: ["Reproductive Biology", "Anatomy & Physiology", "Human Development"]
    },
    illegal: {
        categoryName: "illegal",
        description: "Illegal activities, weapons creation, malware, and malicious hacking.",
        keywords: [
            "bomb", "explosive", "weapon", "weapons", "poison", "malware", "scam", 
            "hack", "hacking", "cctv", "phishing", "piracy", "bypass", "spyware", 
            "trojan", "ransomware", "exploit", "keylogger", "crack", "torrent"
        ],
        phrases: [
            "pipe bomb", "wifi hacking", "credit card hack", "weapon making", "bypass cctv", 
            "movie download", "free download", "malware download", "carding tutorial", 
            "how to hack wifi", "wifi hacking tool", "crack software"
        ],
        patterns: [
            /how\s+to\s+(make|build|create|get)\s+(?:a\s+|an\s+|the\s+)?(bomb|weapon|poison|explosive)/i,
            /how\s+to\s+(ethical\s+)?hack\s+\w+/i,
            /wifi\s+hack/i,
            /bypass\s+cctv/i,
            /free\s+download\s+movie/i,
            /(bomb|explosive|poison|weapon)\s+(making|building|creation)/i
        ],
        suggestions: ["Cybersecurity Fundamentals", "Ethical Hacking Intro", "Network Security", "Digital Safety"]
    },
    hate: {
        categoryName: "hate",
        description: "Harassment, hate speech, bullying, and discrimination.",
        keywords: ["harassment", "bullying", "hate", "racist", "sexist", "slur", "abuse", "cyberbully"],
        phrases: ["hate content", "harass someone", "hate speech", "online abuse"],
        patterns: [
            /hate\s+speech/i,
            /how\s+to\s+harass/i
        ],
        suggestions: ["Digital Citizenship", "Online Communication Ethics", "Empathy & Leadership"]
    },
    distraction: {
        categoryName: "distraction",
        description: "Low-quality, entertainment, or highly distracting content.",
        keywords: ["prank", "meme", "drama", "gossip", "celebrity", "songs", "gaming", "vlog", "clout", "reaction"],
        phrases: ["celebrity gossip", "prank compilation", "reaction drama", "meme spam", "latest songs", "gaming clips"],
        patterns: [
            /prank\s+compilation/i,
            /latest\s+songs/i,
            /reaction\s+video/i
        ],
        suggestions: ["Creative Writing", "Video Production Basics", "Game Design Fundamentals"]
    }
};

// Educational overrides with their respective reduction power
const EDUCATIONAL_TRIGGERS = [
    { term: "fundamentals", pattern: /\b(fundamentals|basics|intro|introduction|principles|essentials)\b/i, scoreReduction: 3 },
    { term: "tutorial", pattern: /\b(tutorial|course|lecture|class|guide|lesson|study|learn)\b/i, scoreReduction: 3 },
    { term: "academic", pattern: /\b(academic|research|science|biology|anatomy|history|theory)\b/i, scoreReduction: 4 },
    { term: "ethical", pattern: /\b(ethical|cybersecurity|security|defense|analysis)\b/i, scoreReduction: 4 },
    { term: "history of", pattern: /history\s+of\s+\w+/i, scoreReduction: 5 },
    { term: "ethical hacking", pattern: /ethical\s+hacking/i, scoreReduction: 6 },
    { term: "malware analysis", pattern: /malware\s+analysis/i, scoreReduction: 6 },
    { term: "cybersecurity fundamentals", pattern: /cybersecurity\s+fundamentals/i, scoreReduction: 6 },
    { term: "anatomy lecture", pattern: /anatomy\s+lecture/i, scoreReduction: 6 },
    { term: "reproductive biology", pattern: /reproductive\s+biology/i, scoreReduction: 6 }
];

const DEFAULT_SUGGESTIONS = [
    "Computer Science Basics",
    "Introduction to Physics",
    "World Literature"
];

/**
 * Merges sequences of single characters separated by spaces.
 * E.g., "b o m b" -> "bomb"
 * 
 * @param {string} text - The input space-separated string.
 * @returns {string} The text with single-letter sequences merged.
 */
export const mergeSingleChars = (text) => {
    if (!text) return "";
    const words = text.split(/\s+/);
    const result = [];
    let tempWord = "";
    
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (word.length === 1) {
            tempWord += word;
        } else {
            if (tempWord) {
                result.push(tempWord);
                tempWord = "";
            }
            result.push(word);
        }
    }
    if (tempWord) {
        result.push(tempWord);
    }
    return result.join(" ");
};

/**
 * Collapses duplicate consecutive characters in a string.
 * E.g., "nssfw" -> "nsfw", "boomb" -> "bomb"
 * 
 * @param {string} text - Input text.
 * @returns {string} Text with duplicates collapsed.
 */
export const collapseDuplicates = (text) => {
    if (!text) return "";
    return text.replace(/(.)\1+/g, "$1");
};

/**
 * Calculates Levenshtein distance between two strings for typo tolerance.
 * 
 * @param {string} a - First string.
 * @param {string} b - Second string.
 * @returns {number} Distance.
 */
export const getLevenshteinDistance = (a, b) => {
    if (!a) return b ? b.length : 0;
    if (!b) return a ? a.length : 0;
    
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,     // Deletion
                    dp[i][j - 1] + 1,     // Insertion
                    dp[i - 1][j - 1] + 1   // Substitution
                );
            }
        }
    }
    return dp[a.length][b.length];
};

/**
 * Automatically corrects typos in a normalized query based on high-risk keywords.
 * E.g. "bomp making" -> "bomb making", "free prn" -> "free porn"
 * 
 * @param {string} query - Normalized query.
 * @returns {string} Corrected query.
 */
export const correctTypos = (query) => {
    if (!query) return "";
    const words = query.split(/\s+/).filter(Boolean);
    const correctedWords = words.map(word => {
        // Ignore extremely short words
        if (word.length < 3) return word;

        for (const cat of Object.values(MODERATION_RULES)) {
            for (const kw of cat.keywords) {
                // Typo check: target keyword must be length >= 4, and distance === 1
                if (kw.length >= 4 && getLevenshteinDistance(word, kw) === 1) {
                    return kw; // Correct the word
                }
            }
        }
        return word;
    });
    return correctedWords.join(" ");
};

/**
 * Normalizes query string: lowercase, unicode normal, leetspeak translation,
 * punctuation stripping, space merging, and space collapsing.
 * 
 * @param {string} query - The raw user search query.
 * @returns {string} The normalized query.
 */
export const normalizeQuery = (query) => {
    if (!query) return "";
    
    // 1. Unicode decomposition and lowercase
    let normalized = query.normalize("NFKD").toLowerCase();
    
    // 2. Leetspeak mapping
    const leetMap = {
        '0': 'o',
        '1': 'i',
        '3': 'e',
        '4': 'a',
        '5': 's',
        '7': 't',
        '8': 'b',
        '@': 'a',
        '$': 's',
        '|': 'i',
        '!': 'i',
        '💣': 'o',
        '🔫': 'gun',
        '🔪': 'knife',
        '🔞': 'porn',
        '🍑': 'porn',
        '茄': 'porn'
    };
    
    let decoded = "";
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized[i];
        decoded += leetMap[char] || char;
    }
    normalized = decoded;
    
    // 3. Replace all non-alphanumeric punctuation and symbols with space
    normalized = normalized.replace(/[^a-z0-9\s]/g, " ");
    
    // 4. Collapse repeated spacing
    normalized = normalized.replace(/\s+/g, " ").trim();
    
    // 5. Merge single characters (e.g. "b o m b" -> "bomb")
    normalized = mergeSingleChars(normalized);
    
    return normalized;
};

/**
 * Evaluates whether a search query is allowed or blocked based on local configuration rules.
 * Runs client-side, does not make network calls.
 * 
 * @param {string} query - The user search query.
 * @returns {ModerationResult} Structured safety report.
 */
export const checkQuerySafetyLocal = (query) => {
    // 1. Initial Empty Check
    if (!query || !query.trim()) {
        return {
            blocked: false,
            allow: true,
            decision: "ALLOW",
            reason: "",
            riskScore: 0,
            matchedCategory: "none",
            matchedTerms: [],
            suggestions: DEFAULT_SUGGESTIONS
        };
    }

    // 2. Normalization
    const rawNormalized = normalizeQuery(query);
    const normalized = correctTypos(rawNormalized); // Typo correction (prn -> porn, bomp -> bomb)
    const collapsed = collapseDuplicates(normalized);
    
    // 3. Check Zero-Tolerance Violations (Immediate block, overrides educational context)
    for (const rule of ZERO_TOLERANCE_RULES) {
        if (rule.pattern.test(normalized) || rule.pattern.test(collapsed)) {
            const categoryMeta = MODERATION_RULES[rule.category] || { suggestions: DEFAULT_SUGGESTIONS };
            return {
                blocked: true,
                allow: false,
                decision: "BLOCK",
                reason: `Zero tolerance violation: ${rule.reason}`,
                riskScore: 10,
                matchedCategory: rule.category,
                matchedTerms: [rule.term],
                suggestions: categoryMeta.suggestions
            };
        }
    }

    // Prepare token arrays
    const words = normalized.split(/\s+/).filter(Boolean);
    const collapsedWords = collapsed.split(/\s+/).filter(Boolean);
    const spacesStripped = normalized.replace(/\s+/g, "");
    const collapsedSpacesStripped = collapsed.replace(/\s+/g, "");

    // Accumulators for matching categories
    const categoryScores = {};
    const categoryMatches = {};

    // 4. Evaluate Moderation Rules across categories
    for (const [catName, config] of Object.entries(MODERATION_RULES)) {
        let catScore = 0;
        const matches = [];

        // A. Regex Pattern Matches (+8 points)
        for (const pattern of config.patterns) {
            if (pattern.test(normalized) || pattern.test(collapsed)) {
                catScore += 8;
                matches.push(pattern.toString());
            }
        }

        // B. Phrase Matches (+6 points)
        for (const phrase of config.phrases) {
            if (normalized.includes(phrase) || collapsed.includes(phrase)) {
                catScore += 6;
                matches.push(phrase);
            }
        }

        // C. Exact Keyword Matches (+4 points)
        for (const keyword of config.keywords) {
            const obfuscatedMatch = spacesStripped.includes(keyword) || collapsedSpacesStripped.includes(keyword);
            const exactMatch = words.includes(keyword) || collapsedWords.includes(keyword);

            if (exactMatch || obfuscatedMatch) {
                catScore += 4;
                matches.push(keyword);
            }
        }

        if (catScore > 0) {
            categoryScores[catName] = catScore;
            categoryMatches[catName] = matches;
        }
    }

    // 5. Determine Primary Violated Category (if any)
    let matchedCategory = "none";
    let baseScore = 0;
    let matchedTerms = [];

    const sortedCategories = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
    if (sortedCategories.length > 0) {
        matchedCategory = sortedCategories[0][0];
        baseScore = sortedCategories[0][1];
        matchedTerms = categoryMatches[matchedCategory];
    }

    // 6. Educational Intent Detection and Score Reduction
    let eduReduction = 0;
    const matchedEduTerms = [];

    for (const edu of EDUCATIONAL_TRIGGERS) {
        if (edu.pattern.test(normalized) || edu.pattern.test(collapsed)) {
            eduReduction += edu.scoreReduction;
            matchedEduTerms.push(edu.term);
        }
    }

    // 7. Calculate Final Risk Score (Clamped between 0 and 10)
    let finalRiskScore = baseScore - eduReduction;
    if (finalRiskScore < 0) finalRiskScore = 0;
    if (finalRiskScore > 10) finalRiskScore = 10;

    // 8. Contentious Decision Logic
    let decision = "ALLOW";
    if (finalRiskScore >= 7) {
        decision = "BLOCK";
    } else if (finalRiskScore >= 4) {
        decision = "REVIEW";
    }

    const blocked = decision === "BLOCK";
    const categoryInfo = MODERATION_RULES[matchedCategory];
    const suggestions = categoryInfo ? categoryInfo.suggestions : DEFAULT_SUGGESTIONS;

    // 9. Generate Reason Message
    let reason = "";
    if (blocked) {
        reason = `Search query contains unsafe terms flagged under category: "${matchedCategory}".`;
    } else if (decision === "REVIEW") {
        reason = `Search query contains potentially sensitive terms under review: "${matchedCategory}".`;
    }

    // Append educational exceptions log if applicable
    if (eduReduction > 0 && baseScore > 0) {
        reason += ` Educational context detected (${matchedEduTerms.join(", ")}).`;
    }

    return {
        blocked,
        allow: !blocked, // Backwards compatibility helper
        decision,
        reason,
        riskScore: finalRiskScore,
        matchedCategory,
        matchedTerms,
        suggestions
    };
};
