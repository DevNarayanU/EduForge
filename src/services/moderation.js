/**
 * Service to manage moderation cooldown states, violation tracking,
 * and behavior rules inside EduForge.
 */

const KEYS = {
    COOLDOWN_UNTIL: "eduforge_cooldown_until",
    VIOLATION_COUNT: "eduforge_violation_count",
    LAST_VIOLATION_TIME: "eduforge_last_violation_time"
};

/**
 * Gets the number of seconds remaining on the active cooldown.
 * @returns {number} The remaining seconds, or 0 if no cooldown is active.
 */
export const getCooldownTimeLeft = () => {
    try {
        const cooldownUntil = localStorage.getItem(KEYS.COOLDOWN_UNTIL);
        if (!cooldownUntil) return 0;
        
        const timeLeftMs = parseInt(cooldownUntil, 10) - Date.now();
        if (timeLeftMs <= 0) {
            // Clean up expired cooldown
            localStorage.removeItem(KEYS.COOLDOWN_UNTIL);
            return 0;
        }
        
        return Math.ceil(timeLeftMs / 1000);
    } catch (e) {
        console.warn("Failed to check cooldown time left", e);
        return 0;
    }
};

/**
 * Resets the violation count if the user has shown prolonged good behavior
 * (no violations for 5 minutes).
 */
export const checkResetGoodBehavior = () => {
    try {
        const lastViolation = localStorage.getItem(KEYS.LAST_VIOLATION_TIME);
        if (!lastViolation) return;

        const GOOD_BEHAVIOR_PERIOD = 5 * 60 * 1000; // 5 minutes
        if (Date.now() - parseInt(lastViolation, 10) > GOOD_BEHAVIOR_PERIOD) {
            console.log("[Moderation] Resetting violation count due to prolonged good behavior.");
            localStorage.setItem(KEYS.VIOLATION_COUNT, "0");
        }
    } catch (e) {
        console.warn("Failed to check/reset good behavior", e);
    }
};

/**
 * Registers a new safety violation. Calculates cooldown time based on violation history
 * and updates localStorage state.
 * 
 * @returns {Object} An object containing the new { duration } (in seconds) and total { count }.
 */
export const registerViolation = () => {
    try {
        // Reset count first if enough time has passed with good behavior
        checkResetGoodBehavior();

        const currentCountStr = localStorage.getItem(KEYS.VIOLATION_COUNT) || "0";
        const newCount = parseInt(currentCountStr, 10) + 1;

        localStorage.setItem(KEYS.VIOLATION_COUNT, newCount.toString());
        localStorage.setItem(KEYS.LAST_VIOLATION_TIME, Date.now().toString());

        // Cooldown schedule:
        // Attempt 1: 0s (Warning only)
        // Attempt 2: 10s
        // Attempt 3: 30s
        // Attempt 4+: 60s (longer cooldown)
        let duration = 0;
        if (newCount === 2) {
            duration = 10;
        } else if (newCount === 3) {
            duration = 30;
        } else if (newCount >= 4) {
            duration = 60;
        }

        if (duration > 0) {
            const cooldownUntil = Date.now() + duration * 1000;
            localStorage.setItem(KEYS.COOLDOWN_UNTIL, cooldownUntil.toString());
            console.log(`[Moderation] Active cooldown set for ${duration}s (violation #${newCount}).`);
        }

        return { duration, count: newCount };
    } catch (e) {
        console.warn("Failed to register violation", e);
        return { duration: 0, count: 1 };
    }
};

/**
 * Returns the current violation count.
 * @returns {number} The count.
 */
export const getViolationCount = () => {
    try {
        checkResetGoodBehavior();
        const currentCountStr = localStorage.getItem(KEYS.VIOLATION_COUNT) || "0";
        return parseInt(currentCountStr, 10);
    } catch {
        return 0;
    }
};

/**
 * Checks if the user has repeated violations (count >= 3).
 * @returns {boolean} True if violations >= 3.
 */
export const hasRepeatedViolations = () => {
    return getViolationCount() >= 3;
};
