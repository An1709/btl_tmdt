import mongoose from "mongoose";

const warrantySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    
    reason: { type: String, required: true },
    images: [{ type: String }],
    
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Rejected', 'Completed'], 
        default: 'Pending' 
    },
    adminResponse: { type: String }
}, { timestamps: true });

export default mongoose.model("WarrantyRequest", warrantySchema);