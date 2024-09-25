import axios from "axios";
import * as cheerio from "cheerio";
import { extractCurrency, extractDescription, extractPrice } from "../utils";

export async function scrapAmazonProduct(url: string) {
  if (!url) return;

  // curl -i --proxy brd.superproxy.io:22225 --proxy-user brd-customer-hl_aa4e140c-zone-pricewise:ijuob98t91yg -k "https://geo.brdtest.com/welcome.txt" && echo -e "\n\nFor additional information visit:\nhttps://docs.brightdata.com/general/account/ssl-certificate\n"

  // BrightData proxy config
  const username = String(process.env.BRIGHT_DATA_USERNAME);
  const password = String(process.env.BRIGHT_DATA_PASSWORD);
  const port = 22225;
  const session_id = 1000000 * Math.random() || 0;

  const options = {
    auth: {
      username: `${username}-session-${session_id}`,
      password,
    },
    host: "brd.superproxy.io",
    port,
    rejectUnauthorized: false,
  };

  try {
    const response = await axios.get(url, options);
    const $ = cheerio.load(response.data);

    const title = $("#productTitle").text().trim();
    const currentPrice = extractPrice(
      $(".priceToPay span.a-price-whole"),
      $("a.size.base.a-color-price"),
      $(".a-button-selected .a-color-base"),
      $(".a-price.a-text-price")
    );

    const originalPrice = extractPrice(
      $('#priceblock_ourprice'),
      $('.a-price.a-text-price span.a-offscreen'),
      $('#listPrice'),
      $('#priceblock_dealprice'),
      $('.a-size-base.a-color-price')   
    )

    const outOfStock = $('#availability span').text().trim().toLowerCase() === 'currently unavailable'
    const images = $('#imgBlkFront').attr('data-a-dynamic-image') || 
       $('#landingImage').attr('data-a-dynamic-image') || ''

    const imageUrls = Object.keys(JSON.parse(images))
    
    const currency = extractCurrency($('.a-price-symbol'))
    const discountRate = $('.savingsPercentage').text().replace(/^[-%]/g, '')

    const description = extractDescription($)

    const data = {
      url, 
      currency : currency || '$',
      image : imageUrls[0],
      title,
      currentPrice : Number(currentPrice) || Number(originalPrice),
      originalPrice : Number(originalPrice),
      priceHistory : [],
      discountRate : Number(discountRate),
      category : 'category',
      reviewsCount : 50,
      stars : 4.5,
      isOutOfStock : outOfStock,
      description,
      lowestPrice : Number(currentPrice) || Number(originalPrice),
      highestPrice : Number(originalPrice) || Number(currentPrice),
      averagePrice : Number(currentPrice) || Number(originalPrice)
    }

    return data;

    
  } catch (error: any) {
    throw new Error(`Failed to scrape product : ${error.message}`);
  }
}
