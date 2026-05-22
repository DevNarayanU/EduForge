import {
    BLOCKED_QUERIES,
    BLOCKED_KEYWORDS,
    BLOCKED_PHRASES,
    BLOCKED_QUERY_PATTERNS,
    ALLOWED_EDUCATIONAL_EXCEPTIONS
} from "../constants";

/**
 * Merges sequences of single characters separated by spaces.
 * E.g., "b o m b" -> "bomb", "h a c k i n g" -> "hacking"
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
 * Compiles a wildcard pattern (e.g. "how to make *") into a Regex
 * and matches it against the query.
 * 
 * @param {string} query - The query to check.
 * @param {string} pattern - The pattern containing wildcard asterisk.
 * @returns {boolean} True if matched.
 */
export const matchPattern = (query, pattern) => {
    if (!pattern) return false;
    
    // Escape regex characters except the asterisk '*'
    let regexStr = pattern.replace(/[-\\^$+.()|[\]{}]/g, "\\$&");
    
    // Replace '*' with '.*' to match any character sequence
    regexStr = regexStr.replace(/\*/g, ".*");
    
    // Perform full-string regex match (case-insensitive)
    const regex = new RegExp(`^${regexStr}$`, "i");
    return regex.test(query);
};

/**
 * Helper to retrieve safety categories for warning mappings.
 */
export const getCategoryForTerm = (term) => {
    const termLower = term.toLowerCase();
    
    const categories = {
        dangerous: ["bomb", "explosive", "poison", "malware", "hacking", "cctv", "fraud", "scam", "weapon"],
        violence: ["torture", "gore", "execution", "murder", "cartel", "injury", "violent"],
        sexual: ["porn", "hentai", "nsfw", "fetish", "nude", "explicit", "leaked nudes"],
        toxic: ["humiliation", "harassment", "bullying", "hate"],
        entertainment: ["movie", "song", "gossip", "prank", "drama", "meme"]
    };
    
    for (const [cat, terms] of Object.entries(categories)) {
        if (terms.some(t => termLower.includes(t) || t.includes(termLower))) {
            return cat;
        }
    }
    
    return "inappropriate";
};

/**
 * Checks if the normalized string contains the target word as a condensed substring.
 */
const checkObfuscatedWordMatch = (normalized, word) => {
    const noSpaces = normalized.replace(/\s+/g, "");
    return noSpaces.includes(word);
};

/**
 * Evaluates whether a search query is allowed or blocked based on local configuration rules.
 * Runs client-side, does not make network calls.
 * 
 * @param {string} query - The user search query.
 * @returns {Object} { allow: boolean, reason?: string, category?: string }
 */
export const checkQuerySafetyLocal = (query) => {
    if (!query || !query.trim()) {
        return { allow: true };
    }
    
    const normalized = normalizeQuery(query);
    const collapsed = collapseDuplicates(normalized);
    const words = normalized.split(/\s+/).filter(Boolean);
    const collapsedWords = collapsed.split(/\s+/).filter(Boolean);
    
    let isBlocked = false;
    let blockReason = "";
    let blockCategory = "inappropriate";
    
    // 1. Check exact/strong matches on BLOCKED_QUERIES
    const matchedQuery = BLOCKED_QUERIES.find(bq => {
        const normBq = normalizeQuery(bq);
        return normalized === normBq || collapsed === normBq;
    });
    
    if (matchedQuery) {
        isBlocked = true;
        blockReason = `Query matched blocked query: "${matchedQuery}"`;
        blockCategory = getCategoryForTerm(matchedQuery);
    }
    
    // 2. Check single words in BLOCKED_KEYWORDS
    if (!isBlocked) {
        const matchedKeyword = BLOCKED_KEYWORDS.find(kw => {
            const normKw = normalizeQuery(kw);
            return (
                words.includes(normKw) ||
                collapsedWords.includes(normKw) ||
                checkObfuscatedWordMatch(normalized, normKw)
            );
        });
        
        if (matchedKeyword) {
            isBlocked = true;
            blockReason = `Query contains blocked keyword: "${matchedKeyword}"`;
            blockCategory = getCategoryForTerm(matchedKeyword);
        }
    }
    
    // 3. Check substrings in BLOCKED_PHRASES
    if (!isBlocked) {
        const matchedPhrase = BLOCKED_PHRASES.find(pr => {
            const normPr = normalizeQuery(pr);
            return normalized.includes(normPr) || collapsed.includes(normPr);
        });
        
        if (matchedPhrase) {
            isBlocked = true;
            blockReason = `Query contains blocked phrase: "${matchedPhrase}"`;
            blockCategory = getCategoryForTerm(matchedPhrase);
        }
    }
    
    // 4. Check BLOCKED_QUERY_PATTERNS (wildcards + keyword triggers)
    if (!isBlocked) {
        const matchedPattern = BLOCKED_QUERY_PATTERNS.find(pattern => {
            const normPattern = normalizeQuery(pattern);
            if (matchPattern(normalized, normPattern) || matchPattern(collapsed, normPattern)) {
                // Confirm query contains a blocked keyword or phrase
                const containsKeyword = BLOCKED_KEYWORDS.some(kw => {
                    const normKw = normalizeQuery(kw);
                    return (
                        words.includes(normKw) ||
                        collapsedWords.includes(normKw) ||
                        checkObfuscatedWordMatch(normalized, normKw)
                    );
                });
                
                const containsPhrase = BLOCKED_PHRASES.some(pr => {
                    const normPr = normalizeQuery(pr);
                    return normalized.includes(normPr) || collapsed.includes(normPr);
                });
                
                return containsKeyword || containsPhrase;
            }
            return false;
        });
        
        if (matchedPattern) {
            isBlocked = true;
            blockReason = `Query matches blocked pattern containing keywords: "${matchedPattern}"`;
            blockCategory = getCategoryForTerm(matchedPattern);
        }
    }
    
    // 5. Special check for strict subsets where spaces are stripped entirely (e.g. "makebomb")
    if (!isBlocked) {
        const spacesStripped = normalized.replace(/\s+/g, "");
        const collapsedSpacesStripped = collapsed.replace(/\s+/g, "");
        const strictSubstrings = ["bomb", "porn", "hentai", "nsfw", "fetish"];
        
        const matchedStrict = strictSubstrings.find(sub => 
            spacesStripped.includes(sub) || collapsedSpacesStripped.includes(sub)
        );
        
        if (matchedStrict) {
            isBlocked = true;
            blockReason = `Query contains strict blocked term: "${matchedStrict}"`;
            blockCategory = getCategoryForTerm(matchedStrict);
        }
    }
    
    // 6. Educational Exceptions Override
    if (isBlocked) {
        const matchedException = ALLOWED_EDUCATIONAL_EXCEPTIONS.find(ex => {
            const normEx = normalizeQuery(ex);
            return normalized.includes(normEx) || collapsed.includes(normEx);
        });
        
        if (matchedException) {
            isBlocked = false; // Bypass the block
        }
    }
    
    if (isBlocked) {
        return {
            allow: false,
            reason: blockReason,
            category: blockCategory
        };
    }
    
    return { allow: true };
};
