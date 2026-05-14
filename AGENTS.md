# AGENTS.md — AI Coding Rules for TMDT Project

## 1. General Rules

- Always read the existing project structure before making changes.
- Do not rewrite the whole project unless explicitly requested.
- Make minimal, targeted, and safe changes.
- Keep the current architecture, naming style, folder structure, and coding conventions.
- Do not introduce a new framework, state management library, UI library, or backend architecture unless I explicitly ask.
- Prefer fixing root causes, not temporary hacks.
- After finishing, summarize changed files, commands run, and remaining risks.

## 2. Safety Rules

- Do not delete files unless clearly necessary.
- Do not remove existing features while fixing one bug.
- Do not modify `.env`, API keys, payment secrets, database credentials, Firebase keys, email credentials, or production config unless I explicitly ask.
- Do not run destructive commands:
  - `rm -rf`
  - `git reset --hard`
  - `git clean -fd`
  - dropping/truncating database tables
  - deleting migration files
- Before large refactors, ask for confirmation.

## 3. Git Rules

- Do not commit automatically unless I ask.
- Do not push to remote unless I ask.
- Do not change branches unless I ask.
- Keep changes small and easy to review.
- Show the modified files after completing the task.

## 4. Project Scope Rules

- This is an e-commerce project.
- Preserve existing business flows:
  - user authentication
  - product browsing
  - cart
  - checkout
  - order creation
  - payment
  - order status update
  - admin dashboard
  - coupon/discount management
  - inventory/product stock
- When fixing one module, check related frontend and backend code before editing.

## 5. Frontend Rules

- Keep the existing UI style and layout.
- Do not redesign pages unless explicitly requested.
- Do not add new packages unless necessary.
- Preserve existing route structure unless the bug is caused by routing.
- When changing API calls, check:
  - service/API files
  - page/component using the API
  - response shape
  - loading/error states
- Do not break existing admin pages or customer pages.

## 6. Backend Rules

- Keep the existing backend architecture.
- Do not rename database tables, columns, entities, DTOs, or API endpoints unless necessary.
- Do not change API response format unless frontend usage is updated too.
- Add validation and error handling where needed.
- Avoid duplicated business logic.
- When fixing a bug, inspect controller, service, repository/model, DTO/request/response, and related frontend code.

## 7. Database Rules

- Do not change database schema unless required.
- If schema change is required, explain why before doing it.
- Do not drop, truncate, or reset tables.
- Do not overwrite seed data unless asked.
- Be careful with:
  - users
  - products
  - orders
  - order_items
  - payments
  - coupons
  - inventory/stock
  - roles/permissions

## 8. Authentication and Authorization Rules

- Do not weaken authentication.
- Do not bypass JWT/session checks.
- Do not expose admin APIs to normal users.
- Check role-based access when editing:
  - admin dashboard
  - order management
  - product management
  - coupon management
  - user management
- Never store passwords in plain text.
- Do not log sensitive user data or tokens.

## 9. Payment Rules

- Treat payment logic carefully.
- Do not change merchant keys, hash secret, return URL, payment URL, or payment config without confirmation.
- When fixing payment flow, inspect:
  - payment creation endpoint
  - VNPay/Momo/payment return endpoint
  - payment verification/hash validation
  - order creation logic
  - order status update logic
  - frontend success/failure routing
- Make sure successful payment maps to an existing order.
- Avoid duplicate orders when payment callback/return URL is called multiple times.
- Do not mark an order as paid unless payment verification is valid.
- Preserve failed/cancelled payment handling.

## 10. Order Rules

- Be careful with order status transitions.
- Do not randomly change status names.
- Check both customer and admin order views after editing order logic.
- When changing order detail logic, check:
  - order id
  - user id
  - order items
  - total price
  - payment status
  - shipping info
  - coupon/discount
- Users should not be able to access other users’ orders.

## 11. Product, Stock, and Coupon Rules

- Do not allow stock to become negative.
- Do not break product detail, product list, search, filter, or admin product CRUD.
- When editing coupon logic, check:
  - expiration date
  - usage limit
  - minimum order value
  - discount type
  - duplicate usage
- Do not apply coupons incorrectly after payment or order refresh.

## 12. Testing and Build Rules

- After editing code, run relevant checks if available:
  - `npm run build`
  - `npm run lint`
  - backend test/build command
- Do not run `npm install` unless dependencies are missing.
- If a command fails, read the error and fix it instead of guessing.
- If tests/build cannot be run, explain why.

## 13. Output Format

After finishing, report clearly:

1. Issue found
2. Root cause
3. Files changed
4. Changes made in each file
5. Commands run
6. Build/test result
7. Remaining risks or manual steps
