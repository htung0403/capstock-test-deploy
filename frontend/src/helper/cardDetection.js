/**
 * Card Detection Helper
 * 
 * Tập hợp các utility functions để nhận diện và xử lý thông tin thẻ tín dụng/ghi nợ
 * Hỗ trợ: VISA, MASTERCARD, JCB, AMERICAN EXPRESS
 */

// Định nghĩa các loại thẻ và pattern nhận diện
export const CARD_TYPES = [
  { 
    code: "VISA", 
    name: "Visa", 
    logo: "💳", 
    pattern: /^4/,
    length: [13, 16, 19], // Hỗ trợ nhiều độ dài
    cvvLength: 3
  },
  { 
    code: "MASTERCARD", 
    name: "Mastercard", 
    logo: "💳", 
    pattern: /^5[1-5]/,
    length: [16],
    cvvLength: 3
  },
  { 
    code: "JCB", 
    name: "JCB", 
    logo: "💳", 
    pattern: /^35/,
    length: [16],
    cvvLength: 3
  },
  { 
    code: "AMEX", 
    name: "American Express", 
    logo: "💳", 
    pattern: /^3[47]/,
    length: [15],
    cvvLength: 4
  },
];

/**
 * Nhận diện loại thẻ dựa trên số thẻ (BIN - Bank Identification Number)
 * 
 * @param {string} cardNumber - Số thẻ cần nhận diện
 * @returns {string|null} - Mã loại thẻ hoặc null nếu không nhận diện được
 * 
 * @example
 * detectCardType("4532123456789012") // returns "VISA"
 * detectCardType("5412345678901234") // returns "MASTERCARD"
 * detectCardType("3532123456789012") // returns "JCB"
 * detectCardType("371234567890123")  // returns "AMEX"
 * detectCardType("6011123456789012") // returns null
 */
export const detectCardType = (cardNumber) => {
  // Loại bỏ spaces và ký tự không phải số
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (!cleaned) return null;
  
  // Kiểm tra từng pattern
  for (const card of CARD_TYPES) {
    if (card.pattern.test(cleaned)) {
      return card.code;
    }
  }
  
  return null;
};

/**
 * Format số thẻ với khoảng trắng theo chuẩn (4-4-4-4) hoặc (4-6-5) cho AMEX
 * 
 * @param {string} value - Số thẻ cần format
 * @param {string} cardType - Loại thẻ (optional, để format theo chuẩn riêng)
 * @returns {string} - Số thẻ đã được format
 * 
 * @example
 * formatCardNumber("4532123456789012") // returns "4532 1234 5678 9012"
 * formatCardNumber("371234567890123", "AMEX") // returns "3712 345678 90123"
 */
export const formatCardNumber = (value, cardType = null) => {
  const cleaned = value.replace(/\D/g, '');
  
  if (!cleaned) return '';
  
  // Format đặc biệt cho AMEX (4-6-5)
  if (cardType === 'AMEX') {
    const match = cleaned.match(/^(\d{1,4})(\d{0,6})(\d{0,5})$/);
    if (match) {
      return [match[1], match[2], match[3]]
        .filter(group => group)
        .join(' ');
    }
  }
  
  // Format chuẩn (4-4-4-4) cho các loại thẻ khác
  const match = cleaned.match(/.{1,4}/g);
  return match ? match.join(' ') : cleaned;
};

/**
 * Lấy thông tin chi tiết của loại thẻ
 * 
 * @param {string} cardType - Mã loại thẻ
 * @returns {object|null} - Thông tin chi tiết hoặc null
 * 
 * @example
 * getCardTypeInfo("VISA") 
 * // returns { code: "VISA", name: "Visa", logo: "💳", ... }
 */
export const getCardTypeInfo = (cardType) => {
  return CARD_TYPES.find(card => card.code === cardType) || null;
};

/**
 * Kiểm tra độ dài số thẻ có hợp lệ không
 * 
 * @param {string} cardNumber - Số thẻ
 * @param {string} cardType - Loại thẻ
 * @returns {boolean} - true nếu độ dài hợp lệ
 * 
 * @example
 * isValidCardLength("4532123456789012", "VISA") // returns true
 * isValidCardLength("371234567890123", "AMEX") // returns true
 * isValidCardLength("45321234", "VISA") // returns false
 */
export const isValidCardLength = (cardNumber, cardType) => {
  const cleaned = cardNumber.replace(/\D/g, '');
  const cardInfo = getCardTypeInfo(cardType);
  
  if (!cardInfo) return false;
  
  return cardInfo.length.includes(cleaned.length);
};

/**
 * Lấy độ dài CVV hợp lệ cho loại thẻ
 * 
 * @param {string} cardType - Loại thẻ
 * @returns {number} - Độ dài CVV (3 hoặc 4)
 * 
 * @example
 * getCVVLength("VISA") // returns 3
 * getCVVLength("AMEX") // returns 4
 */
export const getCVVLength = (cardType) => {
  const cardInfo = getCardTypeInfo(cardType);
  return cardInfo ? cardInfo.cvvLength : 3;
};

/**
 * Validate CVV theo loại thẻ
 * 
 * @param {string} cvv - Mã CVV
 * @param {string} cardType - Loại thẻ
 * @returns {boolean} - true nếu CVV hợp lệ
 * 
 * @example
 * isValidCVV("123", "VISA") // returns true
 * isValidCVV("1234", "AMEX") // returns true
 * isValidCVV("12", "VISA") // returns false
 */
export const isValidCVV = (cvv, cardType) => {
  const expectedLength = getCVVLength(cardType);
  const cleaned = cvv.replace(/\D/g, '');
  
  return cleaned.length === expectedLength;
};

/**
 * Mask số thẻ để bảo mật (chỉ hiện 4 số cuối)
 * 
 * @param {string} cardNumber - Số thẻ
 * @returns {string} - Số thẻ đã mask
 * 
 * @example
 * maskCardNumber("4532123456789012") // returns "****9012"
 * maskCardNumber("4532 1234 5678 9012") // returns "****9012"
 */
export const maskCardNumber = (cardNumber) => {
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.length < 4) return cleaned;
  
  const lastFour = cleaned.slice(-4);
  return `****${lastFour}`;
};

/**
 * Generate test card numbers cho development
 * 
 * @param {string} cardType - Loại thẻ
 * @returns {string} - Số thẻ test
 */
export const getTestCardNumber = (cardType) => {
  const testCards = {
    VISA: "4532123456789012",
    MASTERCARD: "5412345678901234",
    JCB: "3532123456789012",
    AMEX: "371234567890123"
  };
  
  return testCards[cardType] || testCards.VISA;
};

/**
 * Validate expiry date (MM/YY format)
 * 
 * @param {string} expiryDate - Ngày hết hạn
 * @returns {boolean} - true nếu hợp lệ và chưa hết hạn
 * 
 * @example
 * isValidExpiryDate("12/25") // returns true (nếu hiện tại < 12/2025)
 * isValidExpiryDate("12/20") // returns false (đã hết hạn)
 */
export const isValidExpiryDate = (expiryDate) => {
  const regex = /^(0[1-9]|1[0-2])\/\d{2}$/;
  
  if (!regex.test(expiryDate)) return false;
  
  const [month, year] = expiryDate.split('/');
  const currentDate = new Date();
  const expiryDateObj = new Date(2000 + parseInt(year), parseInt(month), 0);
  
  return expiryDateObj >= currentDate;
};

/**
 * Luhn Algorithm để validate số thẻ
 * 
 * @param {string} cardNumber - Số thẻ
 * @returns {boolean} - true nếu số thẻ hợp lệ theo Luhn
 * 
 * @example
 * luhnCheck("4532123456789012") // returns true/false
 */
export const luhnCheck = (cardNumber) => {
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (!cleaned) return false;
  
  let sum = 0;
  let isEven = false;
  
  // Duyệt từ phải sang trái
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

/**
 * Comprehensive card validation
 * 
 * @param {object} cardData - Dữ liệu thẻ
 * @returns {object} - Kết quả validation
 * 
 * @example
 * validateCard({
 *   cardNumber: "4532123456789012",
 *   cardType: "VISA",
 *   expiryDate: "12/25",
 *   cvv: "123"
 * })
 * // returns { isValid: true, errors: [] }
 */
export const validateCard = (cardData) => {
  const errors = [];
  const { cardNumber, cardType, expiryDate, cvv } = cardData;
  
  // Validate card number
  if (!cardNumber) {
    errors.push("Số thẻ là bắt buộc");
  } else {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    if (cleaned.length < 13 || cleaned.length > 19) {
      errors.push("Số thẻ phải có từ 13-19 chữ số");
    }
    
    if (cardType && !isValidCardLength(cardNumber, cardType)) {
      errors.push(`Số thẻ ${cardType} không đúng độ dài`);
    }
    
    if (!luhnCheck(cardNumber)) {
      errors.push("Số thẻ không hợp lệ (Luhn check failed)");
    }
  }
  
  // Validate card type
  if (!cardType) {
    errors.push("Loại thẻ là bắt buộc");
  }
  
  // Validate expiry date
  if (!expiryDate) {
    errors.push("Ngày hết hạn là bắt buộc");
  } else if (!isValidExpiryDate(expiryDate)) {
    errors.push("Ngày hết hạn không hợp lệ hoặc đã hết hạn");
  }
  
  // Validate CVV
  if (!cvv) {
    errors.push("CVV là bắt buộc");
  } else if (cardType && !isValidCVV(cvv, cardType)) {
    const expectedLength = getCVVLength(cardType);
    errors.push(`CVV phải có ${expectedLength} chữ số`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Export default object với tất cả functions
export default {
  CARD_TYPES,
  detectCardType,
  formatCardNumber,
  getCardTypeInfo,
  isValidCardLength,
  getCVVLength,
  isValidCVV,
  maskCardNumber,
  getTestCardNumber,
  isValidExpiryDate,
  luhnCheck,
  validateCard
};