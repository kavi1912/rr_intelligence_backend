"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.propertyRoutes = void 0;
const express_1 = require("express");
const propertyController_1 = require("../controllers/propertyController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.propertyRoutes = router;
router.get('/user/my-properties', auth_1.authenticateToken, propertyController_1.getUserProperties);
router.post('/', auth_1.authenticateToken, propertyController_1.createProperty);
router.put('/:id', auth_1.authenticateToken, propertyController_1.updateProperty);
router.delete('/:id', auth_1.authenticateToken, propertyController_1.deleteProperty);
router.get('/', propertyController_1.getAllProperties);
router.get('/:id', propertyController_1.getPropertyById);
//# sourceMappingURL=properties.js.map