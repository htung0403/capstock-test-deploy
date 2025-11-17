const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    category_name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    parentId: {
        type: mongoose.Types.ObjectId,
        required: false,
        ref: 'Category'
    }
}, {
    timestamps: true,
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
