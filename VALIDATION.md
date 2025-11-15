# Validation System - HR Platform

## Overview

The HR Platform uses comprehensive input validation using **Zod** schema validation library. All API endpoints have proper validation middleware to ensure data integrity and security.

## Validation Features

### 1. **Input Validation**
- Request body validation
- URL parameter validation
- Query parameter validation
- Type-safe validation with TypeScript

### 2. **Common Validations**

#### Email Validation
- Valid email format
- Automatic lowercase conversion
- Trim whitespace

#### Password Validation
- Minimum 8 characters
- Maximum 100 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

#### Phone Number Validation
- International format support
- Regex pattern matching
- Optional field

#### UUID Validation
- Valid UUID v4 format
- Used for all ID parameters

#### OTP Validation
- Exactly 6 digits
- Numeric only

### 3. **Domain-Specific Validations**

#### Individual KYC
- **Age Validation**: 16-100 years
- **Salary Range**: Min ≤ Max validation
- **Date Validation**: Valid date formats
- **URL Validation**: Portfolio and social media URLs
- **Array Validation**: Languages, skills, certifications
- **Consent**: Required boolean validation

#### Industrial KYC
- **Company Size**: Enum validation
- **Business Years**: 0-200 range
- **Document URLs**: Required for certificates

#### Job Postings
- **Salary Validation**: Min ≤ Max, positive values
- **Date Validation**: Expiration date must be in future
- **Skills**: At least one required skill
- **Positions**: 1-1000 range
- **Experience**: 0-50 years range

#### Training Courses
- **Duration**: 1-1000 hours
- **Price**: Non-negative, max 1,000,000
- **Dates**: Start date in future, end date after start
- **Seats**: 1-10,000 range
- **URL Validation**: Materials and resources

#### Exams
- **Duration**: 1-1440 minutes (24 hours)
- **Scores**: Passing score ≤ Total marks
- **Fees**: Non-negative, max 100,000
- **Date Validation**: Exam date in future, interview after exam

#### Events
- **Duration**: 1-1440 minutes
- **Date Validation**: Event date in future
- **Mode Validation**: Online events require meeting link, Physical events require venue
- **Attendees**: 1-100,000 range

## Validation Middleware

### Usage

```typescript
import { validate, validateParams, validateQuery } from '../utils/validation';
import { registerSchema } from '../controllers/auth.controller';

// Body validation
router.post('/register', validate(registerSchema), register);

// URL parameter validation
router.get('/:id', validateParams(z.object({ id: z.string().uuid() })), getItem);

// Query parameter validation
router.get('/', validateQuery(z.object({ page: z.string().optional() })), getAll);
```

## Error Response Format

When validation fails, the API returns:

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "path": "email",
      "message": "Invalid email format"
    },
    {
      "path": "password",
      "message": "Password must contain at least one uppercase letter"
    }
  ]
}
```

## Validation Rules by Endpoint

### Authentication
- **Register**: Email, strong password, optional name/phone
- **Login**: Email, password (required)
- **OTP Verification**: Email, 6-digit code, valid type
- **Resend OTP**: Email, valid type

### Individual KYC
- **Full Name**: 1-200 characters
- **Date of Birth**: Valid date, age 16-100
- **National ID**: Required, max 50 characters
- **Address**: Province, district, municipality, ward required
- **Email**: Valid email format
- **Phone**: Valid phone format
- **Languages**: At least one language required
- **Salary Range**: Min ≤ Max if both provided
- **Consent**: Must be true

### Industrial KYC
- **Company Name**: 1-200 characters
- **Company Email**: Valid email
- **Company Phone**: Valid phone format
- **Address**: Full address required
- **Documents**: Registration, tax, PAN certificates required

### Job Postings
- **Title**: 1-200 characters
- **Description**: 10-10,000 characters
- **Requirements**: 10-5,000 characters
- **Salary**: Min ≤ Max, positive values
- **Skills**: At least one required
- **Expiration**: Must be in future if provided

### Job Applications
- **Job ID**: Valid UUID
- **Applicant ID**: Valid UUID
- **Cover Letter**: Max 5,000 characters
- **Portfolio URL**: Valid URL format

### Training Courses
- **Title**: 1-200 characters
- **Description**: 10-5,000 characters
- **Duration**: 1-1,000 hours
- **Price**: Non-negative, max 1,000,000
- **Dates**: Start in future, end after start
- **Materials**: Valid URLs

### Exams
- **Title**: 1-200 characters
- **Description**: 10-5,000 characters
- **Duration**: 1-1,440 minutes
- **Passing Score**: ≤ Total marks
- **Exam Date**: Must be in future
- **Interview Date**: Must be after exam date

### Events
- **Title**: 1-200 characters
- **Description**: 10-5,000 characters
- **Event Date**: Must be in future
- **Duration**: 1-1,440 minutes
- **Mode Validation**: Online requires link, Physical requires venue

## Best Practices

1. **Always validate input** before processing
2. **Use type-safe schemas** with Zod
3. **Provide clear error messages** for users
4. **Validate at route level** using middleware
5. **Sanitize input** (trim, lowercase where appropriate)
6. **Validate file uploads** (type, size)
7. **Cross-field validation** for related fields (e.g., salary min/max)

## File Upload Validation

- **Allowed Types**: Images, videos, PDFs
- **Max Size**: 50MB per file
- **Validation**: MIME type checking
- **Storage**: Cloudinary cloud storage

## Security Benefits

1. **Prevents SQL Injection**: Type validation prevents malicious input
2. **Data Integrity**: Ensures data meets business rules
3. **User Experience**: Clear error messages guide users
4. **Type Safety**: TypeScript + Zod ensures compile-time safety
5. **Input Sanitization**: Automatic trimming and formatting

## Example Validation Flow

```
Client Request → Validation Middleware → Controller → Database
                      ↓ (if invalid)
                400 Error Response
```

All validation errors return HTTP 400 with detailed field-level error messages.

