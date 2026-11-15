# מדריך לניהול תיעוד קוד - SafeAI Project

## 📋 תוכן עניינים
1. [מצב נוכחי - ניתוח](#מצב-נוכחי---ניתוח)
2. [המלצות מרכזיות](#המלצות-מרכזיות)
3. [תיעוד ברמת הקוד](#1-תיעוד-ברמת-הקוד)
4. [תיעוד API](#2-תיעוד-api)
5. [מבנה תיקיית docs](#3-מבנה-תיקיית-docs)
6. [README ברמת תיקיות](#4-readme-ברמת-תיקיות)
7. [תיעוד אוטומטי](#5-תיעוד-אוטומטי)
8. [תקני תיעוד](#6-תקני-תיעוד)
9. [תיעוד דינמי ואינטראקטיבי](#7-תיעוד-דינמי-ואינטראקטיבי)
10. [תהליך תחזוקה](#8-תהליך-תחזוקה)
11. [סדר עדיפויות ליישום](#סדר-עדיפויות-ליישום)

---

## מצב נוכחי - ניתוח

### ✅ נקודות חוזק
- **תיעוד מערכתי מצוין**: קיימים מסמכי תיעוד איכותיים ברמת המערכת:
  - `docs/PROJECT_SPECIFICATION.md` - אפיון מפורט של הפרויקט
  - `docs/TOKEN_MANAGEMENT.md` - תיעוד מערכת ניהול טוקנים
  - `docs/CLIENT_ROUTING_STRUCTURE.md` - מבנה ניתוב הקליינט
- **JSDoc חלקי**: יש תיעוד JSDoc בחלק מהקבצים (למשל `filterService.ts`)
- **מבנה ברור**: תיקיות ושמות קבצים תיאוריים ומובנים

### ❌ נקודות לשיפור
- **תיעוד קוד לא עקבי**: חלק מהקבצים ללא תיעוד כלל
- **אין תקן אחיד**: חסר תקן לתיעוד פונקציות ו-interfaces
- **חסר תיעוד API**: אין Swagger/OpenAPI documentation
- **חסר README ברמת תיקיות**: אין הסבר על מבנה התיקיות הפנימיות

---

## המלצות מרכזיות

### 1. תיעוד ברמת הקוד (Code-Level Documentation)

#### JSDoc/TSDoc לכל פונקציה ציבורית

**תבנית מומלצת:**
```typescript
/**
 * Evaluates user input text against AI profile rules
 * 
 * @param req - Evaluation request containing profileId and text
 * @param req.profileId - The ID of the AI profile to evaluate against
 * @param req.text - The text content to evaluate
 * @param req.auditDisabled - Whether to disable audit logging
 * @returns Promise with evaluation result (allowed/blocked) and reason
 * @throws {Error} When profileId or text is missing
 * @throws {Error} When AIProfile is not found
 * 
 * @example
 * ```typescript
 * const result = await evaluateText({
 *   profileId: "507f1f77bcf86cd799439011",
 *   text: "Hello world",
 *   auditDisabled: false
 * });
 * console.log(result.allowed); // true or false
 * console.log(result.reason); // "allowed-by-llm" or "blocked-by-llm"
 * ```
 */
export async function evaluateText(
  req: EvaluateRequest
): Promise<EvaluateResponse> {
  // Implementation...
}
```

#### תיעוד Interfaces ו-Types

**תבנית מומלצת:**
```typescript
/**
 * User authentication and profile information
 * 
 * @interface User
 * @property {string} _id - Unique user identifier (MongoDB ObjectId)
 * @property {string} email - User's email address (unique, validated)
 * @property {string} name - User's full name
 * @property {('admin'|'user')} role - User role determining access level
 * @property {('BYOK'|'MANAGED')} mode - Operation mode:
 *   - BYOK: Bring Your Own Key (user provides API keys)
 *   - MANAGED: SafeAI manages API keys
 * @property {string} [profileId] - Optional AI profile ID for filtering rules
 */
interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  mode: 'BYOK' | 'MANAGED';
  profileId?: string;
}
```

#### תיעוד קבצים (File Headers)

**כל קובץ צריך להתחיל עם:**
```typescript
/**
 * @file filterService.ts
 * @description Business logic for creating embeddings and evaluating text 
 *              against user-defined AI profiles and embedding categories
 * @module services/filterService
 * @requires openai
 * @requires ../models
 * @requires ../cache/embeddingCache
 * @author SafeAI Development Team
 * @created 2025-01-15
 * @lastModified 2026-05-11
 */
```

---

### 2. תיעוד API (API Documentation)

#### הוספת Swagger/OpenAPI

**התקנה:**
```bash
npm install --save swagger-jsdoc swagger-ui-express
npm install --save-dev @types/swagger-jsdoc @types/swagger-ui-express
```

**הגדרה ב-`server/src/index.ts`:**
```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SafeAI API Documentation',
      version: '2.0.0',
      description: 'API documentation for SafeAI platform',
      contact: {
        name: 'SafeAI Support',
        email: 'support@safeai.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.safeai.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization'
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

**דוגמה לתיעוד endpoint:**
```typescript
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email and password, returns JWT tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *       400:
 *         description: Missing required fields
 */
router.post('/login', loginHandler);
```

**תיעוד Schemas:**
```typescript
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: User unique identifier
 *         email:
 *           type: string
 *           format: email
 *         name:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, user]
 *         mode:
 *           type: string
 *           enum: [BYOK, MANAGED]
 */
```

---

### 3. מבנה תיקיית docs/

**מבנה מומלץ:**
```
docs/
├── README.md                          # סקירה כללית של כל התיעוד
├── PROJECT_SPECIFICATION.md           # ✅ קיים - אפיון הפרויקט
├── CODE_DOCUMENTATION_GUIDE.md        # ✅ מסמך זה
├── ARCHITECTURE.md                    # ארכיטקטורה טכנית מפורטת
├── API_REFERENCE.md                   # תיעוד API ידני (נוסף ל-Swagger)
├── DEVELOPMENT_GUIDE.md               # מדריך למפתחים חדשים
├── DEPLOYMENT_GUIDE.md                # הוראות פריסה מפורטות
├── SECURITY.md                        # נהלי אבטחה ו-best practices
├── CONTRIBUTING.md                    # הנחיות תרומה לפרויקט
├── CHANGELOG.md                       # היסטוריית שינויים לפי גרסאות
├── TESTING_GUIDE.md                   # אסטרטגיית בדיקות
│
├── features/                          # תיעוד תכונות ספציפיות
│   ├── TOKEN_MANAGEMENT.md            # ✅ קיים
│   ├── CLIENT_ROUTING_STRUCTURE.md    # ✅ קיים
│   ├── FILTER_SYSTEM.md               # תיעוד מערכת הסינון
│   ├── AUTHENTICATION.md              # תיעוד מערכת האימות
│   ├── PROXY_SYSTEM.md                # תיעוד מערכת ה-Proxy
│   └── USER_MANAGEMENT.md             # תיעוד ניהול משתמשים
│
├── api/                               # תיעוד API מפורט
│   ├── authentication.md              # Endpoints של אימות
│   ├── users.md                       # Endpoints של משתמשים
│   ├── profiles.md                    # Endpoints של פרופילים
│   └── proxy.md                       # Endpoints של Proxy
│
├── troubleshooting/                   # פתרון בעיות
│   ├── COMMON_ISSUES.md               # בעיות נפוצות ופתרונות
│   ├── FAQ.md                         # שאלות נפוצות
│   └── ERROR_CODES.md                 # רשימת קודי שגיאה
│
└── diagrams/                          # דיאגרמות ותרשימים
    ├── architecture.png               # דיאגרמת ארכיטקטורה
    ├── auth-flow.png                  # זרימת אימות
    └── filter-flow.png                # זרימת סינון
```

---

### 4. README ברמת תיקיות

#### דוגמה: `server/src/services/README.md`

```markdown
# Services Layer

שכבת הלוגיקה העסקית המכילה את השירותים המרכזיים של האפליקציה.

## 📋 סקירת Services

### Authentication & Authorization
- **authService.ts** - אימות משתמשים, יצירת JWT tokens, ניהול sessions
- **userService.ts** - ניהול משתמשים, CRUD operations, ניהול הרשאות

### AI & Filtering
- **filter/** - סינון תוכן: חילוץ הטקסט, judge (החלטת LLM), תשובות חסימה
- **trace/** - רשומת מעקב אחת לכל בקשה בפרוקסי (RequestLog)
- **filterService.ts** - embeddings (סינון וקטורי ישן, לא בשימוש)
- **promptBuilder.ts** - בניית prompts מותאמים אישית לפי פרופילים
- **promptService.ts** - ניהול prompts, CRUD operations

### Proxy & Integration
- **proxyService.ts** - ניתוב בקשות לספקי AI (OpenAI, Anthropic, Google, Groq)
- **proxyKeyService.ts** - ניהול מפתחות API של משתמשים
- **providerKeyService.ts** - ניהול מפתחות ספקים

### Monitoring & Analytics
- **usageTracker.ts** - מעקב שימוש, חישוב עלויות, logging

### Organization Management
- **organizationService.ts** - ניהול ארגונים, משתמשים ארגוניים

## 🏗️ Architecture Pattern

Services עוקבים אחר ה-Repository Pattern ומטפלים ב:

1. **Business Logic Validation** - ולידציה של נתונים ולוגיקה עסקית
2. **Data Transformation** - המרת נתונים בין שכבות
3. **External API Calls** - קריאות ל-APIs חיצוניים (OpenAI, LiteLLM)
4. **Error Handling** - טיפול בשגיאות והחזרת תשובות מובנות

## 🔄 Data Flow

```
Controller → Service → Repository → Database
                ↓
         External APIs
```

## 📝 Coding Standards

### Function Documentation
כל פונקציה ציבורית חייבת לכלול:
- תיאור תמציתי
- @param לכל פרמטר
- @returns לתיאור הערך המוחזר
- @throws לשגיאות אפשריות
- @example לדוגמת שימוש

### Error Handling
```typescript
try {
  // Business logic
} catch (error) {
  logger.error('Service error:', error);
  throw new Error('User-friendly error message');
}
```

### Async/Await
השתמש ב-async/await במקום promises chains:
```typescript
// ✅ Good
async function getData() {
  const result = await repository.find();
  return result;
}

// ❌ Bad
function getData() {
  return repository.find().then(result => result);
}
```

## 🧪 Testing

כל service צריך לכלול:
- Unit tests ב-`__tests__/serviceName.test.ts`
- Integration tests לקריאות חיצוניות
- Mock של dependencies

## 📚 Related Documentation

- [Repository Layer](../repositories/README.md)
- [Controller Layer](../controllers/README.md)
- [API Documentation](/docs/API_REFERENCE.md)
```

#### דוגמה: `client/src/features/README.md`

```markdown
# Features

תיקייה זו מכילה את כל התכונות (features) של האפליקציה, מאורגנות לפי domain.

## 📁 Structure

```
features/
├── auth/                    # אימות והרשמה
├── safeai-ui/              # ממשק SafeAI הראשי
├── FilterManagement/       # ניהול פרופילי סינון
├── landing/                # דף נחיתה
├── data-history/           # היסטוריית נתונים
├── Inquiries/              # פניות ותמיכה
├── tabl_data/              # תצוגת טבלאות
└── tasks/                  # ניהול משימות (deprecated)
```

## 🎯 Feature Structure

כל feature מכיל:
```
feature-name/
├── components/          # קומפוננטות ייעודיות
├── hooks/              # Custom hooks
├── services/           # API calls
├── types/              # TypeScript types
├── utils/              # Helper functions
└── index.ts            # Public exports
```

## 📝 Naming Conventions

- **Components**: PascalCase (e.g., `LoginForm.tsx`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useAuth.ts`)
- **Services**: camelCase with 'Service' suffix (e.g., `authService.ts`)
- **Types**: PascalCase with 'Type' suffix (e.g., `UserType.ts`)

## 🔗 Related Documentation

- [Component Guidelines](/docs/DEVELOPMENT_GUIDE.md#components)
- [State Management](/docs/DEVELOPMENT_GUIDE.md#state)
```

---

### 5. תיעוד אוטומטי

#### TypeDoc - תיעוד TypeScript אוטומטי

**התקנה:**
```bash
npm install --save-dev typedoc
```

**הגדרה - `typedoc.json`:**
```json
{
  "entryPoints": ["./src"],
  "out": "docs/api",
  "exclude": [
    "**/*test.ts",
    "**/*.spec.ts",
    "**/node_modules/**"
  ],
  "excludePrivate": true,
  "excludeProtected": false,
  "excludeExternals": true,
  "readme": "README.md",
  "name": "SafeAI API Documentation",
  "includeVersion": true,
  "categorizeByGroup": true,
  "defaultCategory": "Other",
  "categoryOrder": [
    "Services",
    "Controllers",
    "Models",
    "Utilities",
    "*"
  ]
}
```

**הוספה ל-`package.json`:**
```json
{
  "scripts": {
    "docs:build": "typedoc",
    "docs:serve": "typedoc --watch",
    "docs:check": "typedoc --validation"
  }
}
```

#### Compodoc - תיעוד Angular/React

**התקנה (לצד Client):**
```bash
npm install --save-dev @compodoc/compodoc
```

**הגדרה:**
```json
{
  "scripts": {
    "docs:client": "compodoc -p tsconfig.json -d docs/client"
  }
}
```

#### JSDoc to Markdown

**התקנה:**
```bash
npm install --save-dev jsdoc-to-markdown
```

**שימוש:**
```bash
jsdoc2md src/**/*.ts > docs/API.md
```

---

### 6. תקני תיעוד

#### קובץ `.docs-standards.md`

```markdown
# Documentation Standards - SafeAI Project

## 📝 Code Comments

### JSDoc/TSDoc Format
כל פונקציה ציבורית חייבת לכלול:
- תיאור תמציתי של מה הפונקציה עושה
- `@param` לכל פרמטר עם תיאור
- `@returns` לתיאור הערך המוחזר
- `@throws` לשגיאות אפשריות
- `@example` לדוגמת שימוש

### Language
- **תיעוד פנימי**: עברית (comments, internal docs)
- **תיעוד API ציבורי**: אנגלית (Swagger, public API docs)
- **קוד**: אנגלית (variable names, function names)

### Examples

#### Function Documentation
```typescript
/**
 * מחשב את הדמיון הקוסינוסי בין שני וקטורים
 * 
 * @param vectorA - וקטור ראשון (מערך מספרים)
 * @param vectorB - וקטור שני (מערך מספרים)
 * @returns ערך בין -1 ל-1 המייצג את הדמיון
 * @throws {Error} אם הוקטורים באורכים שונים
 * 
 * @example
 * ```typescript
 * const similarity = cosineSimilarity([1, 2, 3], [4, 5, 6]);
 * console.log(similarity); // 0.974
 * ```
 */
export function cosineSimilarity(vectorA: number[], vectorB: number[]): number
```

#### Interface Documentation
```typescript
/**
 * בקשה להערכת טקסט מול פרופיל AI
 * 
 * @interface EvaluateRequest
 */
export interface EvaluateRequest {
  /** מזהה הפרופיל לבדיקה מולו */
  profileId: string;
  
  /** הטקסט להערכה */
  text: string;
  
  /** האם לדלג על רישום audit log */
  auditDisabled?: boolean;
}
```

## 📄 File Headers

כל קובץ צריך להתחיל עם:
```typescript
/**
 * @file קובץ זה מטפל ב...
 * @module path/to/module
 * @author SafeAI Development Team
 * @created YYYY-MM-DD
 * @lastModified YYYY-MM-DD
 */
```

## 💬 Inline Comments

### When to Comment
- **כן**: הסבר לוגיקה מורכבת, החלטות עיצוב, workarounds
- **לא**: הסבר קוד פשוט שמובן מאליו

### Examples

```typescript
// ✅ Good - מסביר החלטה לא ברורה
// Using GPT-4o-mini instead of embeddings for better context understanding
const decision = await getLLMDecision(text, profile);

// ❌ Bad - מיותר
// Increment counter by 1
counter++;

// ✅ Good - מסביר workaround
// HACK: LiteLLM requires trailing slash, remove when fixed in v2.0
const url = litellmUrl.endsWith('/') ? litellmUrl : `${litellmUrl}/`;
```

## 📋 Commit Messages

עקוב אחר [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: תכונה חדשה
- `fix`: תיקון באג
- `docs`: שינויים בתיעוד
- `style`: שינויי פורמט (לא משפיעים על הקוד)
- `refactor`: שינוי קוד שלא מוסיף תכונה או מתקן באג
- `test`: הוספת בדיקות
- `chore`: שינויים בתהליך build או כלים

### Examples
```
feat(auth): add Google OAuth login

Implemented Google OAuth 2.0 authentication flow with automatic
user creation and token management.

Closes #123
```

```
fix(filter): handle empty profile categories

Added validation to prevent errors when profile has no categories
defined. Returns default "uncertain" decision.

Fixes #456
```

## 📚 README Files

### Project Root README
- סקירה כללית של הפרויקט
- הוראות התקנה
- הוראות הרצה
- קישורים לתיעוד נוסף

### Directory README
- מטרת התיקייה
- מבנה קבצים
- קונבנציות
- דוגמאות שימוש

## 🔄 Documentation Updates

### When to Update
- כל שינוי ב-API
- הוספת תכונה חדשה
- שינוי בארכיטקטורה
- תיקון באג משמעותי

### Review Process
- תיעוד נבדק כחלק מ-code review
- CI/CD בודק שלמות תיעוד
- עדכון CHANGELOG.md בכל release
```

---

### 7. תיעוד דינמי ואינטראקטיבי

#### Storybook לקומפוננטות React

**התקנה:**
```bash
npx storybook@latest init
```

**יצירת story:**
```typescript
// client/src/components/TopNavigation.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import TopNavigation from './TopNavigation';

const meta: Meta<typeof TopNavigation> = {
  title: 'Components/TopNavigation',
  component: TopNavigation,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TopNavigation>;

export const Default: Story = {
  args: {
    userRole: 'user',
  },
};

export const Admin: Story = {
  args: {
    userRole: 'admin',
  },
};
```

#### Postman/Insomnia Collections

**ייצוא collection:**
1. צור collection עם כל ה-endpoints
2. הוסף דוגמאות request/response
3. ייצא כ-JSON
4. שמור ב-`docs/api/postman-collection.json`

**דוגמה:**
```json
{
  "info": {
    "name": "SafeAI API",
    "description": "Complete API collection for SafeAI platform",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"SecurePass123\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["api", "auth", "login"]
            }
          }
        }
      ]
    }
  ]
}
```

---

### 8. תהליך תחזוקה

#### בדיקות תיעוד ב-CI/CD

**קובץ `.github/workflows/docs.yml`:**
```yaml
name: Documentation Check

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  check-docs:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          cd server && npm ci
          cd ../client && npm ci
      
      - name: Check JSDoc coverage
        run: |
          cd server && npm run docs:check
      
      - name: Build TypeDoc
        run: |
          cd server && npm run docs:build
      
      - name: Build Swagger docs
        run: |
          cd server && npm run docs:swagger
      
      - name: Upload documentation artifacts
        uses: actions/upload-artifact@v3
        with:
          name: documentation
          path: |
            server/docs/api
            server/docs/swagger.json
      
      - name: Check for broken links
        uses: gaurav-nelson/github-action-markdown-link-check@v1
        with:
          use-quiet-mode: 'yes'
          folder-path: 'docs/'
```

#### npm Scripts

**הוספה ל-`server/package.json`:**
```json
{
  "scripts": {
    "docs:build": "typedoc",
    "docs:serve": "typedoc --watch",
    "docs:check": "typedoc --validation",
    "docs:swagger": "node scripts/generate-swagger.js",
    "docs:all": "npm run docs:build && npm run docs:swagger"
  }
}
```

**הוספה ל-`client/package.json`:**
```json
{
  "scripts": {
    "docs:build": "compodoc -p tsconfig.json -d docs/client",
    "docs:serve": "compodoc -p tsconfig.json -s",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

#### Pre-commit Hooks

**התקנת husky:**
```bash
npm install --save-dev husky
npx husky install
```

**יצירת hook:**
```bash
npx husky add .husky/pre-commit "npm run docs:check"
```

---

## סדר עדיפויות ליישום

### 🔴 עדיפות גבוהה (High Priority)

1. **הוספת JSDoc לכל הפונקציות הציבוריות ב-services**
   - משך משוער: 2-3 ימי עבודה
   - השפעה: שיפור משמעותי בקריאות הקוד
   - קבצים: `server/src/services/*.ts`

2. **יצירת Swagger documentation ל-API**
   - משך משוער: 3-4 ימי עבודה
   - השפעה: תיעוד API אינטראקטיבי ומעודכן
   - קבצים: כל ה-routes וה-controllers

3. **יצירת `DEVELOPMENT_GUIDE.md`**
   - משך משוער: 1-2 ימי עבודה
   - השפעה: onboarding מהיר למפתחים חדשים
   - תוכן: setup, architecture, coding standards

### 🟡 עדיפות בינונית (Medium Priority)

4. **הוספת README בתיקיות עיקריות**
   - משך משוער: 1-2 ימי עבודה
   - תיקיות: `services/`, `controllers/`, `models/`, `features/`

5. **יצירת `ARCHITECTURE.md`**
   - משך משוער: 2-3 ימי עבודה
   - תוכן: data flow, design patterns, technology stack

6. **הוספת תיעוד לכל ה-interfaces ו-types**
   - משך משוער: 1-2 ימי עבודה
   - קבצים: `types/*.ts`, `models/*.ts`

### 🟢 עדיפות נמוכה (Low Priority)

7. **הגדרת TypeDoc אוטומטי**
   - משך משוער: 1 יום עבודה
   - השפעה: תיעוד אוטומטי מ-JSDoc

8. **הוספת Storybook לקומפוננטות**
   - משך משוער: 2-3 ימי עבודה
   - השפעה: תיעוד ויזואלי של UI components

9. **יצירת Postman Collection**
   - משך משוער: 1 יום עבודה
   - השפעה: קל יותר לבדוק API

10. **הוספת CI/CD checks לתיעוד**
    - משך משוער: 1 יום עבודה
    - השפעה: אכיפת תקני תיעוד

---

## 🚀 צעדים הבאים

### שלב 1: תשתית (שבוע 1-2)
- [ ] יצירת `.docs-standards.md`
- [ ] הגדרת TypeDoc
- [ ] הגדרת Swagger
- [ ] יצירת תבניות תיעוד

### שלב 2: תיעוד קוד (שבוע 3-5)
- [ ] הוספת JSDoc ל-services
- [ ] הוספת JSDoc ל-controllers
- [ ] תיעוד interfaces ו-types
- [ ] תיעוד utilities

### שלב 3: תיעוד API (שבוע 6-7)
- [ ] Swagger annotations לכל ה-endpoints
- [ ] דוגמאות request/response
- [ ] תיעוד authentication
- [ ] תיעוד error codes

### שלב 4: מדריכים (שבוע 8-9)
- [ ] DEVELOPMENT_GUIDE.md
- [ ] ARCHITECTURE.md
- [ ] DEPLOYMENT_GUIDE.md
- [ ] CONTRIBUTING.md

### שלב 5: אוטומציה (שבוע 10)
- [ ] CI/CD checks
- [ ] Pre-commit hooks
- [ ] Automated builds
- [ ] Link checking

---

## 📚 משאבים נוספים

### כלים מומלצים
- [TypeDoc](https://typedoc.org/) - תיעוד TypeScript
- [Swagger](https://swagger.io/) - תיעוד API
- [Storybook](https://storybook.js.org/) - תיעוד UI components
- [JSDoc](https://jsdoc.app/) - תקן תיעוד JavaScript

### מדריכים
- [TSDoc Specification](https://tsdoc.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

### דוגמאות לפרויקטים עם תיעוד טוב
- [NestJS](https://github.com/nestjs/nest)
- [TypeORM](https://github.com/typeorm/typeorm)
- [React](https://github.com/facebook/react)

---

**תאריך יצירה**: 11/05/2026  
**גרסה**: 1.0  
**מחבר**: AI Assistant  
**סטטוס**: Draft - ממתין לאישור ויישום
