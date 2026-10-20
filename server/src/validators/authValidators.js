import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validate.js';

export const registerValidator = [
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters.'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long.'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim(),
  body('role')
    .optional()
    .isIn(['customer', 'contractor', 'builder'])
    .withMessage('Role must be one of: customer, contractor, builder.'),
  handleValidationErrors
];

export const loginValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required.'),
  body('password')
    .notEmpty()
    .withMessage('Password is required.'),
  handleValidationErrors
];

export const changePasswordValidator = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required.'),
  body('new_password')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long.'),
  handleValidationErrors
];
