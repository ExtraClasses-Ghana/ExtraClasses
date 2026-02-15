import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const METERED_API_KEY = Deno.env.get('METERED_API_KEY');
    if (!METERED_API_KEY) {
      throw new Error('METERED_API_KEY is not configured');
    }

    // Fetch TURN credentials from Metered.ca
    // The subdomain is part of the API key setup on metered.ca
    const response = await fetch(
      `https://extraclasses.metered.live/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Metered API error [${response.status}]: ${errorText}`);
    }

    const iceServers = await response.json();

    return new Response(JSON.stringify({ iceServers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error fetching TURN credentials:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
