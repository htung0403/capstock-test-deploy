const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true,
        minlength: 1,
        maxlength: 200, // cho phép dài hơn một chút
        required: false,
    },
    content: {
        type: String,
        trim: true,
        minlength: 1, // cho phép viết rất ngắn
        maxlength: 50000, // thoải mái
        required: false,
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false, // cho phép null
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: false, // không bắt buộc
    },
    tags: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tag",
            required: false,
        },
    ],
    symbol: {
        type: String,
        trim: true,
        uppercase: true,
        required: false,
    },
    summary: {
        type: String,
        trim: true,
        maxlength: 2000, // cho phép dài thoải mái
        required: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    isPublished: {
        type: Boolean,
        default: false,
        required: false,
    },
    publishBy: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    publishedAt: {
        type: Date,
        required: false,
    },
    status: {
        type: String,
        enum: ["draft", "pending", "published", "denied"],
        default: "draft",
        required: false,
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    reviewedAt: {
        type: Date,
        required: false,
    },
    deleteRequest: {
        requested: {
            type: Boolean,
            default: false,
        },
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
        requestedAt: {
            type: Date,
            required: false,
        },
        reason: {
            type: String,
            trim: true,
            maxlength: 500,
            required: false,
        },
    },
    thumbnail: {
        type: String,
        trim: true,
        maxlength: 500,
        required: false,
    },
    isPremium: {
        type: Boolean,
        default: false,
        required: false,
    },
    note: {
        type: String,
        trim: true,
        maxlength: 2000,
        required: false,
    },
    // MongoDB Atlas Vector Search: Store embedding vector (384 dimensions for all-MiniLM-L6-v2)
    embedding: {
        type: [Number],
        required: false,
        select: false, // Don't return by default (large array)
    },
    // Track if embedding has been generated
    embeddingGenerated: {
        type: Boolean,
        default: false,
    },
    embeddingGeneratedAt: {
        type: Date,
        required: false,
    },
});

const Article = mongoose.model("Article", articleSchema);

module.exports = Article;
