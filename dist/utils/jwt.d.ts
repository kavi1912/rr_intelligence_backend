export interface JWTPayload {
    id: string;
    email: string;
    username: string;
}
export declare const generateToken: (payload: JWTPayload) => string;
export declare const verifyToken: (token: string) => JWTPayload;
export declare const extractTokenFromHeader: (authHeader?: string) => string;
//# sourceMappingURL=jwt.d.ts.map