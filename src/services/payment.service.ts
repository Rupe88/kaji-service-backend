import axios from 'axios';
import crypto from 'crypto';

interface EsewaConfig {
    merchantId: string;
    successUrl: string;
    failureUrl: string;
    esewaPaymentUrl: string;
    esewaVerificationUrl: string;
}

interface KhaltiConfig {
    secretKey: string;
    websiteUrl: string;
    khaltiPaymentUrl: string;
}

class PaymentService {
    private esewaConfig: EsewaConfig;
    private khaltiConfig: KhaltiConfig;

    constructor() {
        this.esewaConfig = {
            merchantId: process.env.ESEWA_MERCHANT_ID || 'EPAYTEST', // Default test ID
            successUrl: process.env.ESEWA_SUCCESS_URL || 'http://localhost:3000/payment/success',
            failureUrl: process.env.ESEWA_FAILURE_URL || 'http://localhost:3000/payment/failure',
            esewaPaymentUrl: process.env.NODE_ENV === 'production'
                ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
                : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
            esewaVerificationUrl: process.env.NODE_ENV === 'production'
                ? 'https://epay.esewa.com.np/api/epay/transaction/status/'
                : 'https://rc-epay.esewa.com.np/api/epay/transaction/status/',
        };

        this.khaltiConfig = {
            secretKey: process.env.KHALTI_SECRET_KEY || 'test_secret_key',
            websiteUrl: process.env.KHALTI_WEBSITE_URL || 'http://localhost:3000',
            khaltiPaymentUrl: 'https://a.khalti.com/api/v2/epayment/initiate/',
        };
    }

    /**
     * Generate eSewa Signature
     * The signature is generated using HMAC-SHA256
     * Message format: "total_amount,transaction_uuid,product_code"
     */
    generateEsewaSignature(totalAmount: string, transactionUuid: string, productCode: string): string {
        const message = `${totalAmount},${transactionUuid},${productCode}`;
        const secret = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q'; // Default test secret

        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(message);
        return hmac.digest('base64');
    }

    /**
     * Get eSewa Payment Config
     * Returns parameters needed for the frontend form
     */
    getEsewaPaymentConfig(amount: number, transactionId: string) {
        const totalAmount = amount.toString();
        const signature = this.generateEsewaSignature(
            totalAmount,
            transactionId,
            this.esewaConfig.merchantId
        );

        return {
            amount: totalAmount,
            tax_amount: "0",
            total_amount: totalAmount,
            transaction_uuid: transactionId,
            product_code: this.esewaConfig.merchantId,
            product_service_charge: "0",
            product_delivery_charge: "0",
            success_url: this.esewaConfig.successUrl,
            failure_url: this.esewaConfig.failureUrl,
            signed_field_names: "total_amount,transaction_uuid,product_code",
            signature: signature,
            action_url: this.esewaConfig.esewaPaymentUrl,
        };
    }

    /**
     * Verify eSewa Transaction
     * Calls eSewa API to check transaction status
     */
    async verifyEsewaPayment(totalAmount: number, transactionUuid: string): Promise<boolean> {
        try {
            const productCode = this.esewaConfig.merchantId;


            // Construct the URL with query parameters
            const url = `${this.esewaConfig.esewaVerificationUrl}?product_code=${productCode}&total_amount=${totalAmount}&transaction_uuid=${transactionUuid}`;

            // Since eSewa's status API is a GET request and often requires checking via signature locally or separate status check endpoint
            // Note: The v2 status check endpoint documentation specifies query parameters.

            const response = await axios.get(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            // Check response status
            // eSewa returns strict status structure
            if (response.data && response.data.status === 'COMPLETE') {
                return true;
            }

            console.log('eSewa verification failed:', response.data);
            return false;
        } catch (error) {
            console.error('Error verifying eSewa payment:', error);
            return false;
        }
    }

    /**
     * Initiate Khalti Payment
     */
    async initiateKhaltiPayment(
        amount: number, // in Paisa (e.g. 1000 = Rs 10)
        purchaseOrderId: string,
        purchaseOrderName: string,
        customerInfo: { name: string; email: string; phone: string }
    ) {
        try {
            const payload = {
                "return_url": this.khaltiConfig.websiteUrl + "/payment/khalti-success",
                "website_url": this.khaltiConfig.websiteUrl,
                "amount": amount, // in paisa
                "purchase_order_id": purchaseOrderId,
                "purchase_order_name": purchaseOrderName,
                "customer_info": customerInfo,
            };

            const response = await axios.post(
                this.khaltiConfig.khaltiPaymentUrl,
                payload,
                {
                    headers: {
                        'Authorization': `Key ${this.khaltiConfig.secretKey}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error("Khalti initiation error:", error);
            throw error;
        }
    }

    /**
     * Verify Khalti Payment (Lookup)
     * The 'pidx' is returned in the success URL from Khalti
     */
    async verifyKhaltiPayment(pidx: string): Promise<boolean> {
        try {
            const response = await axios.post(
                'https://a.khalti.com/api/v2/epayment/lookup/',
                { pidx },
                {
                    headers: {
                        'Authorization': `Key ${this.khaltiConfig.secretKey}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (response.data && response.data.status === 'Completed') {
                return true;
            }
            return false;
        } catch (error) {
            console.error("Khalti verification error:", error);
            return false;
        }
    }
}

export const paymentService = new PaymentService();
export default paymentService;
