export const MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters`;

export function isValidPassword(password) {
    return !!password && password.length >= MIN_PASSWORD_LENGTH;
}
