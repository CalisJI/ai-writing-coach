import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('app.py','utf8');
const admin=fs.readFileSync('static/admin.js','utf8');
const template=fs.readFileSync('templates/index.html','utf8');
assert.match(app,/@app\.get\("\/api\/admin\/product-activity"/);
assert.match(app,/def admin_product_activity\(request: Request/);
assert.match(app,/def admin_product_activity\(request: Request/);
assert.match(app,/def admin_product_activity[\s\S]{0,500}product_activity_response\(request, _specialized_learning_repository, require_admin/);
assert.match(admin,/fetch\('\/api\/admin\/product-activity\?window_days=7'/);
assert.match(admin,/adminProductActivity/);
assert.match(admin,/Daily activity\/completions/);
assert.match(template,/id="adminProductActivity"/);
assert.match(template,/No learner text, media URLs, or identifiers/);
assert.doesNotMatch(admin,/event\.text|event\.media_url|event\.learner_id/);
console.log('Product activity Admin API/UI contract: PASS');
