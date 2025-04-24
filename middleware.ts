import jwt, { JwtPayload } from "jsonwebtoken";
import { APIError } from "encore.dev/api";

const SECRET_KEY = process.env.SECRET_KEY || "your-secret-key"; // Replace with your actual secret key

export const authenticateJWT = async (req: any, res: any, next: () => void): Promise<void> => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    throw APIError.unauthenticated("Authorization header is missing");
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    throw APIError.unauthenticated("Token is missing from the authorization header");
  }

  try {
    // Verify the token and extract the payload
    const decoded = jwt.verify(token, SECRET_KEY) as JwtPayload;
    if (!decoded.userId) {
      throw APIError.unauthenticated("Invalid token payload: userId is missing");
    }

    // Attach userId to the request object
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw APIError.unauthenticated("Token has expired");
    } else if (err instanceof jwt.JsonWebTokenError) {
      throw APIError.unauthenticated("Invalid token");
    } else {
      throw APIError.unauthenticated("Authentication failed");
    }
  }
};