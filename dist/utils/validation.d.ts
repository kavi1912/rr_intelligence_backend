export declare const validateEmail: (email: string) => boolean;
export declare const validatePhoneNumber: (phone: string) => boolean;
export declare const validatePassword: (password: string) => {
    isValid: boolean;
    message?: string;
};
export declare const validateBase64Image: (base64String: string) => boolean;
export declare const validatePropertyImages: (images: string[]) => {
    isValid: boolean;
    message?: string;
};
export declare const sanitizeInput: (input: string) => string;
export declare const validateStringLength: (str: string, min: number, max: number) => boolean;
export declare const validateNumericRange: (num: number, min?: number, max?: number) => boolean;
export declare const validateId: (id: string) => boolean;
//# sourceMappingURL=validation.d.ts.map