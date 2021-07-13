import { response } from 'cfw-easy-utils'

export default async ({ env }) => {
  const { 
    TURRET_ADDRESS, 
    STELLAR_NETWORK, 
    HORIZON_URL, 
    TURRET_RUN_URL, 
    XLM_FEE_MIN,
    XLM_FEE_MAX, 
    TX_FUNCTION_FEE_DAYS_TTL, 
    UPLOAD_DIVISOR, 
    RUN_DIVISOR 
  } = env

  return response.json({
    turret: TURRET_ADDRESS,
    network: STELLAR_NETWORK,
    horizon: HORIZON_URL,
    runner: TURRET_RUN_URL,
    version: VERSION,
    fee: {
      min: XLM_FEE_MIN,
      max: XLM_FEE_MAX,
      days: TX_FUNCTION_FEE_DAYS_TTL
    },
    divisor: {
      upload: UPLOAD_DIVISOR, 
      run: RUN_DIVISOR
    },
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300', // 5 minutes
    }
  })
}