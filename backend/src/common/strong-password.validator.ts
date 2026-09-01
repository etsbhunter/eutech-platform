import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";

// Minimum 8 characters, at least one uppercase, one lowercase, one number,
// one symbol -- matches the visible password-policy guidance shown in the UI.
const STRONG_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isStrongPassword",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === "string" && STRONG_PASSWORD_PATTERN.test(value);
        },
        defaultMessage(_args: ValidationArguments) {
          return "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a symbol.";
        },
      },
    });
  };
}
