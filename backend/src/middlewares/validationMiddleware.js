const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const validateUuidParams = (paramNames = []) => {
    return (req, res, next) => {
        for (const paramName of paramNames) {
            const value = req.params[paramName];
            if (value !== undefined) {
                if (!UUID_REGEX.test(value)) {
                    return res.status(400).json({ error: `Invalid identifier format: ${paramName}` });
                }
            }
        }
        next();
    };
};
