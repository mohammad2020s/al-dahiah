export interface AlQasabWeatherData {
  source: "google" | "fallback";
  temperature: number;
  feelsLike: number;
  conditionText: string;
  conditionType: string;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  maxTemperature?: number;
  minTemperature?: number;
  precipitationPercent?: number;
  uvIndex?: number;
  iconUri?: string;
  updatedAt: string;
  summaryText: string;
}

let cachedWeather: { data: AlQasabWeatherData; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3000;

export function generateFallbackAlQasabWeather(): AlQasabWeatherData {
  const currentHour = new Date().getUTCHours() + 3;
  const isNight = currentHour < 6 || currentHour >= 19;
  const temp = isNight ? 24 : 33;
  const feelsLike = isNight ? 23 : 32;
  const condition = isNight ? "صافٍ ليلاً" : "صحو ومشمس";
  const conditionType = "CLEAR";
  const humidity = isNight ? 28 : 16;
  const windSpeed = 12;
  const windDir = "NE";
  const maxTemp = 36;
  const minTemp = 22;

  const summaryParts = [
    `الطقس الحالي في مدينة القصب وتوابعها:`,
    `- درجة الحرارة: ${temp}° مئوية (المحسوسة: ${feelsLike}° مئوية).`,
    `- الحالة العامة: ${condition}.`,
    `- العظمى المتوقعة ${maxTemp}° مئوية والصغرى ${minTemp}° مئوية.`,
    `- الرطوبة النسبية: ${humidity}%.`,
    `- سرعة الرياح: ${windSpeed} كم/س باتجاه ${windDir}.`,
    `- مؤشر الأشعة فوق البنفسجية (UV): ${isNight ? 0 : 6}.`,
  ];

  return {
    source: "fallback",
    temperature: temp,
    feelsLike,
    conditionText: condition,
    conditionType,
    humidity,
    windSpeed,
    windDirection: windDir,
    maxTemperature: maxTemp,
    minTemperature: minTemp,
    precipitationPercent: 0,
    uvIndex: isNight ? 0 : 6,
    updatedAt: new Date().toISOString(),
    summaryText: summaryParts.join("\n"),
  };
}

export function getCachedOrFallbackWeather(): AlQasabWeatherData {
  if (cachedWeather) return cachedWeather.data;
  return generateFallbackAlQasabWeather();
}

export async function fetchAlQasabWeather(timeoutMs: number = FETCH_TIMEOUT_MS): Promise<AlQasabWeatherData> {
  const now = Date.now();
  if (cachedWeather && now - cachedWeather.timestamp < CACHE_TTL_MS) {
    return cachedWeather.data;
  }

  const apiKey = process.env.GOOGLE_WEATHER_API_KEY?.trim() || process.env.WEATHER?.trim();
  if (!apiKey) {
    const fallback = generateFallbackAlQasabWeather();
    cachedWeather = { data: fallback, timestamp: now };
    return fallback;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort();
    } catch {
      // ignore
    }
  }, timeoutMs);

  const fetchPromise = (async (): Promise<AlQasabWeatherData> => {
    try {
      const url = new URL("https://weather.googleapis.com/v1/currentConditions:lookup");
      url.searchParams.set("key", apiKey);
      url.searchParams.set("location.latitude", "25.2974");
      url.searchParams.set("location.longitude", "45.5298");
      url.searchParams.set("unitsSystem", "METRIC");
      url.searchParams.set("languageCode", "ar");

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      if (!res.ok) {
        if (cachedWeather) {
          cachedWeather.timestamp = now;
          return cachedWeather.data;
        }
        const fallback = generateFallbackAlQasabWeather();
        cachedWeather = { data: fallback, timestamp: now };
        return fallback;
      }

      const json = await res.json();
      const temp = Math.round(json.temperature?.degrees ?? 0);
      const feelsLike = Math.round(json.feelsLikeTemperature?.degrees ?? temp);
      const condition = json.weatherCondition?.description?.text || "صحو";
      const conditionType = json.weatherCondition?.type || "CLEAR";
      const humidity = json.relativeHumidity ?? 0;
      const windSpeed = Math.round(json.wind?.speed?.value ?? 0);
      const windDir = json.wind?.direction?.cardinal || "";
      const maxTemp = json.currentConditionsHistory?.maxTemperature?.degrees != null
        ? Math.round(json.currentConditionsHistory.maxTemperature.degrees)
        : undefined;
      const minTemp = json.currentConditionsHistory?.minTemperature?.degrees != null
        ? Math.round(json.currentConditionsHistory.minTemperature.degrees)
        : undefined;
      const precip = json.precipitation?.probability?.percent;
      const uv = json.uvIndex;
      const iconUri = json.weatherCondition?.iconBaseUri
        ? `${json.weatherCondition.iconBaseUri}.png`
        : undefined;

      const summaryParts = [
        `الطقس الحالي في مدينة القصب:`,
        `- درجة الحرارة: ${temp}° مئوية (المحسوسة: ${feelsLike}° مئوية).`,
        `- الحالة: ${condition}.`,
        maxTemp !== undefined && minTemp !== undefined
          ? `- العظمى ${maxTemp}° والصغرى ${minTemp}° مئوية.`
          : null,
        `- الرطوبة: ${humidity}%.`,
        `- الرياح: ${windSpeed} كم/س ${windDir}.`,
        precip !== undefined ? `- فرصة هطول الأمطار: ${precip}%.` : null,
        uv !== undefined ? `- مؤشر الأشعة (UV): ${uv}.` : null,
      ].filter(Boolean);

      const data: AlQasabWeatherData = {
        source: "google",
        temperature: temp,
        feelsLike,
        conditionText: condition,
        conditionType,
        humidity,
        windSpeed,
        windDirection: windDir,
        maxTemperature: maxTemp,
        minTemperature: minTemp,
        precipitationPercent: precip,
        uvIndex: uv,
        iconUri,
        updatedAt: new Date().toISOString(),
        summaryText: summaryParts.join("\n"),
      };

      cachedWeather = { data, timestamp: now };
      return data;
    } catch {
      if (cachedWeather) {
        cachedWeather.timestamp = now;
        return cachedWeather.data;
      }
      const fallback = generateFallbackAlQasabWeather();
      cachedWeather = { data: fallback, timestamp: now };
      return fallback;
    } finally {
      clearTimeout(timeoutId);
    }
  })();

  const timeoutFallbackPromise = new Promise<AlQasabWeatherData>(resolve => {
    setTimeout(() => {
      if (cachedWeather) {
        resolve(cachedWeather.data);
      } else {
        const fallback = generateFallbackAlQasabWeather();
        cachedWeather = { data: fallback, timestamp: now };
        resolve(fallback);
      }
    }, timeoutMs);
  });

  return Promise.race([fetchPromise, timeoutFallbackPromise]);
}

// English summary built from the data fields (summaryText and conditionText are Arabic)
export function weatherSummaryEn(d: AlQasabWeatherData | null | undefined): string | undefined {
  if (!d) return undefined;
  const condition = (d.conditionType || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
  const parts = [
    `${Math.round(d.temperature)}°C (feels like ${Math.round(d.feelsLike)}°C)${condition ? `, ${condition.toLowerCase()}` : ""}`,
  ];
  if (d.maxTemperature !== undefined && d.minTemperature !== undefined) {
    parts.push(`high ${Math.round(d.maxTemperature)}°C, low ${Math.round(d.minTemperature)}°C`);
  }
  parts.push(`humidity ${Math.round(d.humidity)}%`, `wind ${Math.round(d.windSpeed)} km/h ${d.windDirection}`);
  if (d.uvIndex !== undefined) parts.push(`UV index ${d.uvIndex}`);
  return parts.join("; ");
}
