# Contributing to NestJS Better-Auth

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to maintain a welcoming and respectful environment for everyone. All contributors are expected to:

- Be respectful and considerate in communication
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker & Docker Compose
- Git

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/nest-better-auth.git
   cd nest-better-auth
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/original-owner/nest-better-auth.git
   ```

4. **Install dependencies**

   ```bash
   pnpm install
   ```

5. **Setup environment**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

6. **Start development**
   ```bash
   pnpm dev
   ```

## Making Changes

### Workflow

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**
   - Write code following the existing patterns
   - Add tests for new functionality
   - Update documentation as needed

3. **Run tests**

   ```bash
   pnpm test           # Unit tests
   pnpm test:e2e       # End-to-end tests
   pnpm lint           # Linting
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, semicolons, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**

```
feat(auth): add magic link authentication
fix(session): resolve token refresh issue
docs(readme): update installation instructions
```

### Branch Naming

- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code refactoring
- `test/*` - Test additions or updates

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Avoid `any` type - use `unknown` when type is truly unknown
- Prefer interfaces over type aliases for object shapes
- Use const assertions (`as const`) for literal values

### NestJS

- Follow NestJS module structure and conventions
- Use dependency injection properly
- Keep controllers thin - delegate to services
- Use guards for authorization
- Use interceptors for cross-cutting concerns

### Naming Conventions

- **Files**: kebab-case (`user-service.ts`, `auth-guard.ts`)
- **Classes**: PascalCase (`UserService`, `AuthGuard`)
- **Variables/Functions**: camelCase (`getUserById`, `isAuthenticated`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Environment Variables**: SCREAMING_SNAKE_CASE (`DATABASE_URL`)

### Code Style

- Use single quotes for strings
- Use semicolons
- 2 spaces for indentation
- Maximum line length: 100 characters
- Trailing commas in multiline

Run formatting before committing:

```bash
pnpm format
```

## Testing

### Writing Tests

- Unit tests for services and utilities
- E2E tests for API endpoints
- Maintain test coverage for new features

### Test Structure

```typescript
describe("UserService", () => {
  let service: UserService;
  let drizzle: DrizzleService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: DrizzleService,
          useValue: mockDrizzleService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    drizzle = module.get<DrizzleService>(DrizzleService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findById", () => {
    it("should return a user by id", async () => {
      const user = await service.findById("user-123");
      expect(user).toBeDefined();
      expect(user.id).toBe("user-123");
    });
  });
});
```

### Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:cov

# E2E tests
pnpm test:e2e
```

## Documentation

### Code Documentation

- Add JSDoc comments for public classes and methods
- Document complex business logic
- Update inline comments when code changes

### API Documentation

- Use NestJS Swagger decorators for API endpoints
- Document request/response schemas
- Provide usage examples

### Markdown Documentation

- Update relevant docs in `/docs` folder
- Add examples for new features
- Keep documentation consistent with existing style

## Pull Request Process

### Before Submitting

1. Ensure all tests pass
2. Run linting and fix any issues
3. Update documentation
4. Rebase on latest main branch

### Submitting

1. Push to your fork

   ```bash
   git push origin feature/your-feature-name
   ```

2. Open a Pull Request on GitHub

3. Fill out the PR template:

   ```markdown
   ## Description

   Brief description of changes

   ## Type of Change

   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing

   Describe testing performed

   ## Checklist

   - [ ] Code follows project style guidelines
   - [ ] Tests added/updated
   - [ ] Documentation updated
   ```

### Review Process

- Respond to review feedback promptly
- Make requested changes
- Don't force push during review

## Reporting Issues

### Bug Reports

Include:

- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS, etc.)
- Error messages and stack traces

### Feature Requests

Include:

- Clear description of the feature
- Use case / motivation
- Possible implementation approaches
- Any relevant examples or references

## Questions?

- Open a Discussion on GitHub
- Check existing issues and discussions
- Review project documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
