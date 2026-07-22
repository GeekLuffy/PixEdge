/**
 * PixEdge — Custom Vanity Slug Helper
 * Handles validation, sanitization, and suggestion generation for custom vanity URLs.
 */

export interface SlugValidationResult {
    valid: boolean;
    error?: string;
    sanitized?: string;
}

/**
 * Validates and sanitizes a custom vanity slug input.
 * Ensures the slug is 2-32 characters, contains no reserved keywords,
 * and formats cleanly for web URLs.
 */
export function validateCustomId(id: string): SlugValidationResult {
    if (!id || id.trim().length === 0) {
        return { valid: false, error: 'Custom vanity slug cannot be empty' };
    }

    // Sanitize: lowercase, trim whitespace, replace spaces & special characters with clean hyphens
    const sanitized = id
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    if (sanitized.length < 2) {
        return { valid: false, error: 'Custom vanity slug must be at least 2 characters' };
    }

    if (sanitized.length > 32) {
        return { valid: false, error: 'Custom vanity slug must be 32 characters or less' };
    }

    // Reserved system routes
    const reserved = ['api', 'admin', 'dashboard', 'login', 'docs', 'upload', 'i', 'static', 'stats', 'icon'];
    if (reserved.includes(sanitized)) {
        return { valid: false, error: 'This vanity slug is reserved by the system' };
    }

    return { valid: true, sanitized };
}

/**
 * Generates alternative vanity slug suggestions when a requested custom ID is taken.
 */
export function generateSuggestions(baseId: string): string[] {
    const suggestions: string[] = [];
    const timestamp = Date.now().toString(36).slice(-4);
    const random = () => Math.random().toString(36).slice(-3);

    suggestions.push(`${baseId}-${timestamp}`);
    suggestions.push(`${baseId}-${random()}`);
    suggestions.push(`${baseId}${Math.floor(Math.random() * 999)}`);

    return suggestions;
}
