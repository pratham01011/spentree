const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    desc: { type: String, required: true, trim: true },
    amt: { type: Number, required: true, min: 0 },
    time: { type: String, required: true }
  },
  { _id: false }
);

const daySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Stored as YYYY-MM-DD (local date)
    dateKey: { type: String, required: true },
    // Display string used in the UI (ex: Mar 20, 2026)
    displayDate: { type: String, required: true },

    budget: { type: Number, required: true, min: 0 },
    spent: { type: Number, required: true, min: 0 },
    health: { type: Number, required: true }, // (budget - spent) / budget

    expenses: { type: [expenseSchema], default: [] }
  },
  { timestamps: true }
);

daySchema.index({ userId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model('Day', daySchema);

