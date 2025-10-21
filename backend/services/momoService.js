/*
  File: services/momoService.js
  Purpose: Handle MoMo payment gateway integration
*/
const crypto = require('crypto');
const https = require('https');

class MoMoService {
  constructor() {
    this.partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
    this.accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
    this.secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    this.endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn';
    this.redirectUrl = process.env.MOMO_REDIRECT_URL || 'http://localhost:3000/payment/result';
    this.ipnUrl = process.env.MOMO_IPN_URL || 'http://localhost:5000/api/payments/momo/ipn';
  }

  /**
   * Tạo chữ ký HMAC SHA256
   * @param {string} rawSignature - Chuỗi cần ký
   * @returns {string} Chữ ký đã tạo
   */
  createSignature(rawSignature) {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');
  }

  /**
   * Tạo payment request đến MoMo
   * @param {string} orderId - ID đơn hàng
   * @param {number} amount - Số tiền (VND)
   * @param {string} orderInfo - Thông tin đơn hàng
   * @param {string} extraData - Dữ liệu bổ sung (JSON string)
   * @returns {Promise<Object>} Response từ MoMo
   */
  async createPayment(orderId, amount, orderInfo, extraData = '') {
    const requestId = orderId;
    const requestType = 'payWithMethod';
    const autoCapture = true;
    const lang = 'vi';

    // Tạo raw signature theo thứ tự alphabet
    const rawSignature = [
      `accessKey=${this.accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${this.ipnUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${this.partnerCode}`,
      `redirectUrl=${this.redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`
    ].join('&');

    // Tạo chữ ký
    const signature = this.createSignature(rawSignature);

    console.log('🔑 MoMo Raw Signature:', rawSignature);
    console.log('🔐 MoMo Signature:', signature);

    // Tạo request body
    const requestBody = {
      partnerCode: this.partnerCode,
      partnerName: 'Stock Trading Platform',
      storeId: 'StockStore',
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: this.redirectUrl,
      ipnUrl: this.ipnUrl,
      lang,
      requestType,
      autoCapture,
      extraData,
      signature
    };

    // Gửi request đến MoMo
    return this.sendRequest(requestBody);
  }

  /**
   * Gửi HTTPS request đến MoMo API
   * @param {Object} requestBody - Request body
   * @returns {Promise<Object>} Response từ MoMo
   */
  sendRequest(requestBody) {
    return new Promise((resolve, reject) => {
      const requestBodyString = JSON.stringify(requestBody);

      const hostname = this.endpoint.replace('https://', '').replace('http://', '');

      const options = {
        hostname,
        port: 443,
        path: '/v2/gateway/api/create',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBodyString)
        }
      };

      console.log('📤 Sending request to MoMo:', hostname);

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log('📥 MoMo Response:', response);
            resolve(response);
          } catch (error) {
            console.error('❌ Error parsing MoMo response:', error);
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ MoMo request error:', error);
        reject(error);
      });

      req.write(requestBodyString);
      req.end();
    });
  }

  /**
   * Verify signature từ IPN callback
   * @param {Object} data - Data từ MoMo IPN
   * @returns {boolean} True nếu signature hợp lệ
   */
  verifySignature(data) {
    try {
      // Tạo raw signature theo thứ tự alphabet
      const rawSignature = [
        `accessKey=${this.accessKey}`,
        `amount=${data.amount}`,
        `extraData=${data.extraData || ''}`,
        `message=${data.message || ''}`,
        `orderId=${data.orderId}`,
        `orderInfo=${data.orderInfo}`,
        `orderType=${data.orderType}`,
        `partnerCode=${data.partnerCode}`,
        `payType=${data.payType}`,
        `requestId=${data.requestId}`,
        `responseTime=${data.responseTime}`,
        `resultCode=${data.resultCode}`,
        `transId=${data.transId}`
      ].join('&');

      const expectedSignature = this.createSignature(rawSignature);

      console.log('🔍 Verify Signature:');
      console.log('  Expected:', expectedSignature);
      console.log('  Received:', data.signature);

      return expectedSignature === data.signature;
    } catch (error) {
      console.error('❌ Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Query transaction status từ MoMo
   * @param {string} orderId - ID đơn hàng
   * @param {string} requestId - ID request
   * @returns {Promise<Object>} Transaction status
   */
  async queryTransaction(orderId, requestId) {
    const rawSignature = [
      `accessKey=${this.accessKey}`,
      `orderId=${orderId}`,
      `partnerCode=${this.partnerCode}`,
      `requestId=${requestId}`
    ].join('&');

    const signature = this.createSignature(rawSignature);

    const requestBody = {
      partnerCode: this.partnerCode,
      requestId,
      orderId,
      signature,
      lang: 'vi'
    };

    return new Promise((resolve, reject) => {
      const requestBodyString = JSON.stringify(requestBody);
      const hostname = this.endpoint.replace('https://', '').replace('http://', '');

      const options = {
        hostname,
        port: 443,
        path: '/v2/gateway/api/query',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBodyString)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(requestBodyString);
      req.end();
    });
  }

  /**
   * Refund transaction
   * @param {string} orderId - ID đơn hàng
   * @param {string} requestId - ID request
   * @param {number} amount - Số tiền refund
   * @param {string} transId - Transaction ID từ MoMo
   * @returns {Promise<Object>} Refund result
   */
  async refundTransaction(orderId, requestId, amount, transId) {
    const description = `Hoàn tiền cho đơn hàng ${orderId}`;

    const rawSignature = [
      `accessKey=${this.accessKey}`,
      `amount=${amount}`,
      `description=${description}`,
      `orderId=${orderId}`,
      `partnerCode=${this.partnerCode}`,
      `requestId=${requestId}`,
      `transId=${transId}`
    ].join('&');

    const signature = this.createSignature(rawSignature);

    const requestBody = {
      partnerCode: this.partnerCode,
      orderId,
      requestId,
      amount,
      transId,
      lang: 'vi',
      description,
      signature
    };

    return new Promise((resolve, reject) => {
      const requestBodyString = JSON.stringify(requestBody);
      const hostname = this.endpoint.replace('https://', '').replace('http://', '');

      const options = {
        hostname,
        port: 443,
        path: '/v2/gateway/api/refund',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBodyString)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(requestBodyString);
      req.end();
    });
  }

  /**
   * Get result code message
   * @param {number} resultCode - Result code từ MoMo
   * @returns {string} Message tương ứng
   */
  getResultMessage(resultCode) {
    const messages = {
      0: 'Thành công',
      9000: 'Giao dịch được authorize thành công',
      1000: 'Giao dịch đã được khởi tạo',
      1001: 'Giao dịch bị từ chối bởi user',
      1002: 'Giao dịch bị từ chối bởi issuer',
      1003: 'Tài khoản không đủ số dư',
      1004: 'Giao dịch không hợp lệ',
      1005: 'Không xác thực được giao dịch',
      1006: 'Giao dịch bị hủy',
      2001: 'Giao dịch timeout',
      9999: 'Lỗi hệ thống'
    };

    return messages[resultCode] || `Lỗi không xác định (${resultCode})`;
  }
}

module.exports = new MoMoService();
