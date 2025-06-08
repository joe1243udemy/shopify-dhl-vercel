const axios = require('axios');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { DHL_USERNAME, DHL_PASSWORD, DHL_ACCOUNT, DHL_API_KEY } = process.env;

  try {
    const { origin, destination, items } = req.body.rate;
    const totalWeight = items.reduce((sum, item) => sum + item.grams, 0) / 1000;

    const dhlRequest = {
      customerDetails: {
        shipperDetails: { postalCode: origin.zip, cityName: origin.city, countryCode: origin.country },
        receiverDetails: { postalCode: destination.zip, cityName: destination.city, countryCode: destination.country }
      },
      accounts: [{ number: DHL_ACCOUNT, typeCode: "shipper" }],
      plannedShippingDateAndTime: new Date().toISOString(),
      productCode: "P",
      packages: [{ weight: totalWeight, dimensions: { length: 30, width: 30, height: 30 } }]
    };

    const { data } = await axios.post(
      'https://express.api.dhl.com/mydhlapi/rates',
      dhlRequest,
      {
        auth: { username: DHL_USERNAME, password: DHL_PASSWORD },
        headers: { 'Content-Type': 'application/json', 'DHL-API-Key': DHL_API_KEY }
      }
    );

    const priceObj = data.products[0].totalPrice[0];

    res.json({
      rates: [{
        service_name: 'DHL Express Worldwide',
        service_code: 'DHL_EXPRESS',
        total_price: Math.round(priceObj.price * 100),
        currency: priceObj.currency,
        description: 'Delivered by DHL Express',
        phone_required: true
      }]
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "DHL rate calculation failed" });
  }
};
