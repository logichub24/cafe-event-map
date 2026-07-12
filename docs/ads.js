var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/@apps-in-toss/bridge-core/dist/index.js
function createAsyncBridge(method) {
  return (...args) => {
    const eventId = createEventId();
    const emitters = [];
    const unsubscribe = () => {
      for (const remove of emitters) {
        remove();
      }
    };
    return new Promise((resolve, reject) => {
      emitters.push(
        nativeWindow.on(`${method}/resolve/${eventId}`, (data) => {
          unsubscribe();
          resolve(data);
        })
      );
      emitters.push(
        nativeWindow.on(`${method}/reject/${eventId}`, (error) => {
          unsubscribe();
          reject(deserializeError(error));
        })
      );
      nativeWindow.postMessage({
        type: "method",
        functionName: method,
        eventId,
        args
      });
    });
  };
}
function createEventBridge(method) {
  return (args) => {
    const eventId = createEventId();
    const removes = [
      nativeWindow.on(`${method}/onEvent/${eventId}`, (data) => {
        args.onEvent(data);
      }),
      nativeWindow.on(`${method}/onError/${eventId}`, (error) => {
        args.onError(deserializeError(error));
      })
    ];
    nativeWindow.postMessage({
      type: "addEventListener",
      functionName: method,
      eventId,
      args: args.options
    });
    return () => {
      nativeWindow.postMessage({
        type: "removeEventListener",
        functionName: method,
        eventId
      });
      removes.forEach((remove) => remove());
    };
  };
}
function createConstantBridge(method) {
  return () => {
    return nativeWindow.getConstant(method);
  };
}
var NativeWindow, nativeWindow, createEventId, deserializeError;
var init_dist = __esm({
  "node_modules/@apps-in-toss/bridge-core/dist/index.js"() {
    NativeWindow = class {
      get _window() {
        if (typeof window !== "undefined") {
          return window;
        }
        return {
          ReactNativeWebView: {
            postMessage: () => {
            }
          },
          __GRANITE_NATIVE_EMITTER: {
            on: () => () => {
            }
          },
          __CONSTANT_HANDLER_MAP: {}
        };
      }
      postMessage(message) {
        const webView = this._window.ReactNativeWebView;
        if (!webView) {
          throw new Error("ReactNativeWebView is not available in browser environment");
        }
        webView.postMessage(JSON.stringify(message));
      }
      on(event, callback) {
        const emitter = this._window.__GRANITE_NATIVE_EMITTER;
        if (!emitter) {
          throw new Error("__GRANITE_NATIVE_EMITTER is not available");
        }
        return emitter.on(event, callback);
      }
      getConstant(method) {
        const constantHandlerMap = this._window.__CONSTANT_HANDLER_MAP;
        if (constantHandlerMap && method in constantHandlerMap) {
          return constantHandlerMap[method];
        }
        throw new Error(`${method} is not a constant handler`);
      }
    };
    nativeWindow = new NativeWindow();
    createEventId = () => Math.random().toString(36).substring(2, 15);
    deserializeError = (value) => {
      if (value && value.__isError) {
        const err = new Error(value.message);
        for (const [key, val] of Object.entries(value)) {
          err[key] = val;
        }
        return err;
      }
      return value;
    };
  }
});

// node_modules/@apps-in-toss/web-bridge/dist/bridge.js
var createEvents, closeView, generateHapticFeedback, share, setSecureScreen, setScreenAwakeMode, getNetworkStatus, setIosSwipeGestureEnabled, openURL, openPermissionDialog, getPermission, requestPermission, setClipboardText, getClipboardText, fetchContacts, fetchAlbumPhotos, getCurrentLocation, openCamera, appLogin, getAnonymousKey, eventLog, getTossShareLink, setDeviceOrientation, checkoutPayment, requestTossPayPaysBilling, saveBase64Data, openPDFViewer, fetchAlbumItems, appsInTossSignTossCert, getGameCenterGameProfile, openGameCenterLeaderboard, submitGameCenterLeaderBoardScore, getUserKeyForGame, grantPromotionReward, grantPromotionRewardForGame, getIsTossLoginIntegratedService, getServerTime, getConsentedUserData, requestReview, getDeclaredAgeRange, getLocale, getSchemeUri, getPlatformOS, getOperationalEnvironment, getTossAppVersion, getDeviceId, getGroupId, contactsViral, startUpdateLocation, onVisibilityChangedByTransparentServiceWeb;
var init_bridge = __esm({
  "node_modules/@apps-in-toss/web-bridge/dist/bridge.js"() {
    init_dist();
    createEvents = function() {
      return { emit: function emit(event, args) {
        for (var callbacks = this.events[event] || [], i = 0, length = callbacks.length; i < length; i++) {
          callbacks[i](args);
        }
      }, events: {}, on: function on(event, cb) {
        var _this = this;
        var _this_events, _event;
        ((_this_events = this.events)[_event = event] || (_this_events[_event] = [])).push(cb);
        return function() {
          var _this_events_event;
          _this.events[event] = (_this_events_event = _this.events[event]) === null || _this_events_event === void 0 ? void 0 : _this_events_event.filter(function(i) {
            return cb !== i;
          });
        };
      } };
    };
    if (typeof window !== "undefined") {
      window.__GRANITE_NATIVE_EMITTER = createEvents();
    }
    closeView = createAsyncBridge("closeView");
    generateHapticFeedback = createAsyncBridge("generateHapticFeedback");
    share = createAsyncBridge("share");
    setSecureScreen = createAsyncBridge("setSecureScreen");
    setScreenAwakeMode = createAsyncBridge("setScreenAwakeMode");
    getNetworkStatus = createAsyncBridge("getNetworkStatus");
    setIosSwipeGestureEnabled = createAsyncBridge("setIosSwipeGestureEnabled");
    openURL = createAsyncBridge("openURL");
    openPermissionDialog = createAsyncBridge("openPermissionDialog");
    getPermission = createAsyncBridge("getPermission");
    requestPermission = createAsyncBridge("requestPermission");
    setClipboardText = createConstantBridge("setClipboardText");
    getClipboardText = createConstantBridge("getClipboardText");
    fetchContacts = createConstantBridge("fetchContacts");
    fetchAlbumPhotos = createConstantBridge("fetchAlbumPhotos");
    getCurrentLocation = createConstantBridge("getCurrentLocation");
    openCamera = createConstantBridge("openCamera");
    appLogin = createAsyncBridge("appLogin");
    getAnonymousKey = createAsyncBridge("getAnonymousKey");
    eventLog = createAsyncBridge("eventLog");
    getTossShareLink = createAsyncBridge("getTossShareLink");
    setDeviceOrientation = createAsyncBridge("setDeviceOrientation");
    checkoutPayment = createAsyncBridge("checkoutPayment");
    requestTossPayPaysBilling = createAsyncBridge("requestTossPayPaysBilling");
    saveBase64Data = createAsyncBridge("saveBase64Data");
    openPDFViewer = createAsyncBridge("openPDFViewer");
    fetchAlbumItems = createAsyncBridge("fetchAlbumItems");
    appsInTossSignTossCert = createAsyncBridge("appsInTossSignTossCert");
    getGameCenterGameProfile = createAsyncBridge("getGameCenterGameProfile");
    openGameCenterLeaderboard = createAsyncBridge("openGameCenterLeaderboard");
    submitGameCenterLeaderBoardScore = createAsyncBridge("submitGameCenterLeaderBoardScore");
    getUserKeyForGame = createAsyncBridge("getUserKeyForGame");
    grantPromotionReward = createAsyncBridge("grantPromotionReward");
    grantPromotionRewardForGame = createAsyncBridge("grantPromotionRewardForGame");
    getIsTossLoginIntegratedService = createAsyncBridge("getIsTossLoginIntegratedService");
    getServerTime = createAsyncBridge("getServerTime");
    getConsentedUserData = createAsyncBridge("getConsentedUserData");
    requestReview = createAsyncBridge("requestReview");
    getDeclaredAgeRange = createAsyncBridge("getDeclaredAgeRange");
    getLocale = createConstantBridge("getLocale");
    getSchemeUri = createConstantBridge("getSchemeUri");
    getPlatformOS = createConstantBridge("getPlatformOS");
    getOperationalEnvironment = createConstantBridge("getOperationalEnvironment");
    getTossAppVersion = createConstantBridge("getTossAppVersion");
    getDeviceId = createConstantBridge("getDeviceId");
    getGroupId = createConstantBridge("getGroupId");
    contactsViral = createEventBridge("contactsViral");
    startUpdateLocation = createEventBridge("startUpdateLocation");
    onVisibilityChangedByTransparentServiceWeb = createEventBridge("onVisibilityChangedByTransparentServiceWeb");
  }
});

// node_modules/@apps-in-toss/types/dist/index.js
var PermissionError, FetchAlbumPhotosPermissionError, FetchContactsPermissionError, OpenCameraPermissionError, Accuracy, GetCurrentLocationPermissionError, StartUpdateLocationPermissionError, GetClipboardTextPermissionError, SetClipboardTextPermissionError;
var init_dist2 = __esm({
  "node_modules/@apps-in-toss/types/dist/index.js"() {
    PermissionError = class extends Error {
      constructor({ methodName, message }) {
        super();
        this.name = `${methodName} permission error`;
        this.message = message;
      }
    };
    FetchAlbumPhotosPermissionError = class extends PermissionError {
      constructor() {
        super({ methodName: "fetchAlbumPhotos", message: "\uC0AC\uC9C4\uCCA9 \uAD8C\uD55C\uC774 \uAC70\uBD80\uB418\uC5C8\uC5B4\uC694." });
      }
    };
    FetchContactsPermissionError = class extends PermissionError {
      constructor() {
        super({ methodName: "fetchContacts", message: "\uC5F0\uB77D\uCC98 \uAD8C\uD55C\uC774 \uAC70\uBD80\uB418\uC5C8\uC5B4\uC694." });
      }
    };
    OpenCameraPermissionError = class extends PermissionError {
      constructor() {
        super({ methodName: "openCamera", message: "\uCE74\uBA54\uB77C \uAD8C\uD55C\uC774 \uAC70\uBD80\uB418\uC5C8\uC5B4\uC694." });
      }
    };
    Accuracy = /* @__PURE__ */ ((Accuracy2) => {
      Accuracy2[Accuracy2["Lowest"] = 1] = "Lowest";
      Accuracy2[Accuracy2["Low"] = 2] = "Low";
      Accuracy2[Accuracy2["Balanced"] = 3] = "Balanced";
      Accuracy2[Accuracy2["High"] = 4] = "High";
      Accuracy2[Accuracy2["Highest"] = 5] = "Highest";
      Accuracy2[Accuracy2["BestForNavigation"] = 6] = "BestForNavigation";
      return Accuracy2;
    })(Accuracy || {});
    GetCurrentLocationPermissionError = class extends PermissionError {
      constructor() {
        super({ methodName: "getCurrentLocation", message: "\uC704\uCE58 \uAD8C\uD55C\uC774 \uAC70\uBD80\uB418\uC5C8\uC5B4\uC694." });
      }
    };
    StartUpdateLocationPermissionError = GetCurrentLocationPermissionError;
    GetClipboardTextPermissionError = class extends PermissionError {
      constructor() {
        super({ methodName: "getClipboardText", message: "\uD074\uB9BD\uBCF4\uB4DC \uC77D\uAE30 \uAD8C\uD55C\uC774 \uAC70\uBD80\uB418\uC5C8\uC5B4\uC694." });
      }
    };
    SetClipboardTextPermissionError = class extends PermissionError {
      constructor() {
        super({ methodName: "setClipboardText", message: "\uD074\uB9BD\uBCF4\uB4DC \uC4F0\uAE30 \uAD8C\uD55C\uC774 \uAC70\uBD80\uB418\uC5C8\uC5B4\uC694." });
      }
    };
  }
});

// node_modules/@apps-in-toss/web-bridge/dist/index.js
function createAsyncBridge2(method) {
  return (...args) => {
    const eventId = createEventId2();
    const emitters = [];
    const unsubscribe = () => {
      for (const remove of emitters) {
        remove();
      }
    };
    return new Promise((resolve, reject) => {
      emitters.push(
        nativeWindow2.on(`${method}/resolve/${eventId}`, (data) => {
          unsubscribe();
          resolve(data);
        })
      );
      emitters.push(
        nativeWindow2.on(`${method}/reject/${eventId}`, (error) => {
          unsubscribe();
          reject(deserializeError2(error));
        })
      );
      nativeWindow2.postMessage({
        type: "method",
        functionName: method,
        eventId,
        args
      });
    });
  };
}
function createEventBridge2(method) {
  return (args) => {
    const eventId = createEventId2();
    const removes = [
      nativeWindow2.on(`${method}/onEvent/${eventId}`, (data) => {
        args.onEvent(data);
      }),
      nativeWindow2.on(`${method}/onError/${eventId}`, (error) => {
        args.onError(deserializeError2(error));
      })
    ];
    nativeWindow2.postMessage({
      type: "addEventListener",
      functionName: method,
      eventId,
      args: args.options
    });
    return () => {
      nativeWindow2.postMessage({
        type: "removeEventListener",
        functionName: method,
        eventId
      });
      removes.forEach((remove) => remove());
    };
  };
}
function createConstantBridge2(method) {
  return () => {
    return nativeWindow2.getConstant(method);
  };
}
function isMinVersionSupported(minVersions) {
  const operationalEnvironment = createConstantBridge2("getOperationalEnvironment")();
  if (operationalEnvironment === "sandbox") {
    return true;
  }
  const currentVersion = createConstantBridge2("getTossAppVersion")();
  const isIOS = createConstantBridge2("getPlatformOS")() === "ios";
  const minVersion = isIOS ? minVersions.ios : minVersions.android;
  if (minVersion === void 0) {
    return false;
  }
  if (minVersion === "always") {
    return true;
  }
  if (minVersion === "never") {
    return false;
  }
  return compareVersions(currentVersion, minVersion) >= 0;
}
function processProductGrant(params) {
  return createAsyncBridge2("processProductGrant")(params);
}
function createPermissionFunction({
  permission,
  handler,
  error
}) {
  const permissionFunction = async (...args) => {
    const permissionStatus = await requestPermission2(permission);
    if (permissionStatus === "denied") {
      throw new error();
    }
    return handler(...args);
  };
  permissionFunction.getPermission = () => getPermission2(permission);
  permissionFunction.openPermissionDialog = () => openPermissionDialog2(permission);
  return permissionFunction;
}
function getOrCreateAttachedBanner(element, createAttachedBanner) {
  const attachedBanner = attachedBannerRegistry.get(element);
  if (attachedBanner) {
    return attachedBanner;
  }
  const createdAttachedBanner = createAttachedBanner();
  let isDestroyed = false;
  const registeredAttachedBanner = {
    destroy() {
      if (isDestroyed) {
        return;
      }
      isDestroyed = true;
      if (attachedBannerRegistry.get(element) === registeredAttachedBanner) {
        attachedBannerRegistry.delete(element);
      }
      createdAttachedBanner.destroy();
    }
  };
  attachedBannerRegistry.set(element, registeredAttachedBanner);
  return registeredAttachedBanner;
}
function resetAttachedBannerRegistry() {
  attachedBannerRegistry = /* @__PURE__ */ new WeakMap();
}
function logBannerErrorToAppLog(info) {
  void tossAdEventLog({
    log_name: BANNER_ERROR_LOG_NAME,
    log_type: "debug",
    params: {
      error_code: info.errorCode,
      error_message: info.errorMessage,
      ad_group_id: info.adGroupId,
      mediation_id: info.mediationId,
      event_context_token: info.eventContextToken
    }
  }).catch(() => {
  });
}
function trackBannerError(info) {
  if (info.endpointError) {
    void fetch(info.endpointError, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventContextToken: info.eventContextToken,
        mediationId: info.mediationId,
        errorCode: info.errorCode,
        errorMessage: info.errorMessage
      })
      // POST 실패(CORS·네트워크) → 앱로그 fallback (endpoint와 같은 채널이라 함께 막히는 경우 대비).
    }).catch(() => logBannerErrorToAppLog(info));
    return;
  }
  logBannerErrorToAppLog(info);
}
function trackResponseError(response, adGroupId, context) {
  if (response.resultType !== "SUCCESS") {
    trackBannerError({
      adGroupId,
      errorCode: API_RESULT_ERROR_CODE_MAP[response.resultType] ?? ERROR_CODES.INTERNAL_ERROR,
      errorMessage: response.error?.reason ?? response.resultType
    });
    return;
  }
  const success = response.success;
  if (!success || NON_ERROR_STATUSES.has(String(success.status))) {
    return;
  }
  trackBannerError({
    adGroupId,
    errorCode: AD_STATUS_ERROR_CODE_MAP[String(success.status)] ?? ERROR_CODES.INTERNAL_ERROR,
    mediationId: context.mediationId,
    eventContextToken: context.eventContextToken,
    errorMessage: `Ad response status: ${success.status}`,
    endpointError: context.errorEndpoint
  });
}
async function handleTrackingRequest(request) {
  if (request.type === "EVENT_TRACKING") {
    await sendEventTracking(request);
  }
}
async function sendEventTracking(request) {
  if (request.urls.length === 0) {
    return;
  }
  const body = JSON.stringify({ type: request.eventName, data: request.eventPayload });
  const headers = { "Content-Type": "application/json" };
  if (request.requestId) {
    headers["X-Toss-RequestId"] = request.requestId;
  }
  const settled = await Promise.allSettled(
    request.urls.map(
      (url) => fetch(url, { method: "POST", headers, body }).then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      })
    )
  );
  const failedCount = settled.filter((result) => result.status === "rejected").length;
  if (failedCount === 0) {
    return;
  }
  trackBannerError({
    adGroupId: request.adGroupId,
    errorCode: ERROR_CODES.NETWORK_ERROR,
    errorMessage: `EVENT_TRACKING failed: ${request.eventName} (${failedCount}/${request.urls.length})`,
    mediationId: request.mediationId || void 0,
    eventContextToken: request.eventContextToken || void 0,
    endpointError: request.errorEndpoint
  });
}
function resolveTossAppBundleId(os) {
  return TOSS_APP_BUNDLE_IDS[os];
}
function normalizeAdResponse(adResponse) {
  const ads = Array.isArray(adResponse.ads) ? adResponse.ads.filter((ad) => SUPPORTED_STYLE_IDS.has(String(ad.styleId))) : [];
  return {
    requestId: adResponse.requestId ?? "",
    // SDK가 event 트래킹 위임(onTrackingRequest) 시 응답 top-level에서 읽어 실어 보낸다.
    // 떼어내면 SDK가 토큰을 못 보고, event 트래킹 실패 시 endpoint.error에서 토큰이 빠진다.
    eventContextToken: adResponse.eventContextToken,
    status: adResponse.status ?? "OK",
    ads,
    ext: adResponse.ext
  };
}
function normalizeApiResponse(raw) {
  if (isApiResponse(raw)) {
    if (raw.resultType !== "SUCCESS") {
      return raw;
    }
    if (!raw.success) {
      return {
        resultType: "FAIL",
        error: { reason: "fetchTossAd returned SUCCESS without payload" }
      };
    }
    return { ...raw, success: normalizeAdResponse(raw.success) };
  }
  if (isAdResponse(raw)) {
    return {
      resultType: "SUCCESS",
      success: normalizeAdResponse(raw)
    };
  }
  return { resultType: "FAIL", error: { reason: "Invalid response from fetchTossAd" } };
}
function isApiResponse(payload) {
  return Boolean(payload && typeof payload === "object" && "resultType" in payload);
}
function isAdResponse(payload) {
  return Boolean(payload && typeof payload === "object" && "ads" in payload);
}
function openUrlOpener(url) {
  const transformed = getWebSchemeOrUri(url);
  return openURL2(transformed);
}
function getWebSchemeOrUri(uri) {
  const isHttp = ["http://", "https://"].some((protocol) => uri.startsWith(protocol));
  return isHttp ? supertossWeb(uri) : uri;
}
function supertossWeb(uri) {
  return `supertoss://web?url=${encodeURIComponent(uri)}&external=true`;
}
async function fireResultTracking(response, adGroupId, ctx) {
  const status = response.success?.status;
  if (response.resultType !== "SUCCESS" || status !== "OK" && status !== "TEST_MODE") {
    return;
  }
  if (ctx.resultEndpoint == null || ctx.mediationId == null) {
    return;
  }
  const body = {
    mediationId: ctx.mediationId,
    spaceUnitId: adGroupId,
    requestId: response.success?.requestId ?? "",
    eventContextToken: ctx.eventContextToken,
    winnerSource: "TOSS",
    content: null,
    adUnitId: ctx.adUnitId ?? null,
    placementId: ctx.placementId ?? null,
    tossFailed: null
  };
  try {
    const res = await fetch(ctx.resultEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (error) {
    trackBannerError({
      adGroupId,
      errorCode: ERROR_CODES.NETWORK_ERROR,
      errorMessage: `RESULT_TRACKING failed: ${error instanceof Error ? error.message : String(error)}`,
      mediationId: ctx.mediationId,
      eventContextToken: ctx.eventContextToken,
      endpointError: ctx.errorEndpoint
    });
  }
}
function getAdsSdk() {
  if (typeof window === "undefined") {
    return void 0;
  }
  return window.TossAdsSpaceKit;
}
function loadAdsSdk() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Ads SDK can only be loaded in a browser environment."));
  }
  const existing = getAdsSdk();
  if (existing) {
    return Promise.resolve(existing);
  }
  if (pendingLoad) {
    return pendingLoad;
  }
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const cleanup = () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
      window.clearTimeout(timeoutId);
      pendingLoad = null;
    };
    const handleLoad = () => {
      const sdk = getAdsSdk();
      if (sdk) {
        cleanup();
        resolve(sdk);
        return;
      }
      cleanup();
      reject(new Error("Ads SDK script loaded but window.TossAdsSpaceKit was not exposed."));
    };
    const handleError = () => {
      cleanup();
      reject(new Error(`Failed to load Ads SDK script from ${DEFAULT_SDK_URL}.`));
    };
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Loading Ads SDK timed out after ${DEFAULT_TIMEOUT_MS}ms.`));
    }, DEFAULT_TIMEOUT_MS);
    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);
    script.async = true;
    script.src = DEFAULT_SDK_URL;
    document.head.appendChild(script);
  });
  pendingLoad = promise;
  return promise;
}
function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function extractAdTrackingContext(response) {
  const mediation = response?.ext?.mediation;
  return {
    mediationId: nonEmptyString(mediation?.mediationId),
    eventContextToken: nonEmptyString(response?.eventContextToken),
    resultEndpoint: nonEmptyString(mediation?.endpoint?.result),
    errorEndpoint: nonEmptyString(mediation?.endpoint?.error),
    adUnitId: nonEmptyString(mediation?.admob?.adUnitId),
    placementId: typeof mediation?.admob?.placementId === "number" ? mediation.admob.placementId : void 0
  };
}
function normalizeAdGroupId(adGroupId) {
  return adGroupId.trim();
}
function createInvalidAdGroupIdError() {
  return new Error(INVALID_AD_GROUP_ID_ERROR_MESSAGE);
}
function createInvalidAdGroupIdResponse() {
  return {
    resultType: "FAIL",
    error: {
      reason: INVALID_AD_GROUP_ID_ERROR_MESSAGE
    }
  };
}
function fetchTossAdPromise(options) {
  return new Promise((resolve, reject) => {
    if (!fetchTossAd.isSupported()) {
      reject(new Error("fetchTossAd is not supported in this environment."));
      return;
    }
    const adGroupId = normalizeAdGroupId(options.adGroupId);
    if (adGroupId.length === 0) {
      reject(createInvalidAdGroupIdError());
      return;
    }
    return fetchTossAd({
      options: {
        ...options,
        adGroupId
      },
      onEvent: resolve,
      onError: reject
    });
  });
}
function getSubBundle() {
  return globalThis.__granite?.app?.name ?? "";
}
function fetchAppsInTossAdPromise(spaceUnitId) {
  const platformOS = getPlatformOS2();
  const tossAppVersion = getTossAppVersion2();
  const body = {
    specVersion: APPS_IN_TOSS_AD_SPEC_VERSION,
    platform: "WEB",
    spaceUnitId,
    sdkVersion: SDK_VERSION,
    availableStyleIds: AVAILABLE_STYLE_IDS,
    // device는 매크로키만 보내고 native가 실제 device로 치환한다.
    device: FETCH_APPS_IN_TOSS_AD_DEVICE_MACRO,
    app: {
      version: tossAppVersion,
      bundle: resolveTossAppBundleId(platformOS),
      subBundle: getSubBundle()
    }
  };
  return new Promise((resolve, reject) => {
    fetchAppsInTossAd({ options: body, onEvent: resolve, onError: reject });
  });
}
function createCustomAdFetcher() {
  return async (_endpoint, request) => {
    const spaceUnitId = normalizeAdGroupId(request.spaceUnitId);
    if (spaceUnitId.length === 0) {
      trackBannerError({
        adGroupId: spaceUnitId,
        errorCode: ERROR_CODES.INVALID_SPACE,
        errorMessage: INVALID_AD_GROUP_ID_ERROR_MESSAGE
      });
      return createInvalidAdGroupIdResponse();
    }
    try {
      const raw = fetchAppsInTossAd.isSupported() ? await fetchAppsInTossAdPromise(spaceUnitId) : await fetchTossAdPromise({
        adGroupId: spaceUnitId,
        sdkId: WEB_SDK_ID,
        availableStyleIds: AVAILABLE_STYLE_IDS
      });
      const response = normalizeApiResponse(raw);
      const trackingContext = extractAdTrackingContext(response.success);
      trackResponseError(response, spaceUnitId, trackingContext);
      void fireResultTracking(response, spaceUnitId, trackingContext);
      return response;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown fetchTossAd error";
      trackBannerError({ adGroupId: spaceUnitId, errorCode: ERROR_CODES.NETWORK_ERROR, errorMessage: reason });
      return { resultType: "FAIL", error: { reason } };
    }
  };
}
function initialize(options) {
  const { callbacks } = options;
  const resolveInitialized = () => callbacks?.onInitialized?.();
  const rejectInitialized = (error) => {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    callbacks?.onInitializationFailed?.(normalizedError);
  };
  const existingSdk = getAdsSdk();
  if (existingSdk?.isInitialized()) {
    resolveInitialized();
    return;
  }
  if (pendingLoad2 != null) {
    pendingLoad2.then(resolveInitialized).catch(rejectInitialized);
    return;
  }
  const initPromise = loadAdsSdk().then((sdk) => {
    if (sdk.isInitialized()) {
      return;
    }
    const customAdFetcher = createCustomAdFetcher();
    const config = {
      environment: "live",
      customAdFetcher,
      opener: openUrlOpener,
      onTrackingRequest: handleTrackingRequest
    };
    sdk.init(config);
  });
  pendingLoad2 = initPromise;
  initPromise.then(resolveInitialized).catch(rejectInitialized).finally(() => {
    if (pendingLoad2 === initPromise) {
      pendingLoad2 = null;
    }
  });
}
function attach(adGroupId, target, options = {}) {
  const { callbacks } = options;
  const normalizedAdGroupId = normalizeAdGroupId(adGroupId);
  const rejectAttached = (error) => {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    callbacks?.onAdFailedToRender?.({
      slotId: "",
      adGroupId: normalizedAdGroupId,
      adMetadata: {},
      error: { code: 0, message: normalizedError.message }
    });
  };
  try {
    const spaceId = normalizedAdGroupId;
    if (spaceId.length === 0) {
      throw createInvalidAdGroupIdError();
    }
    const sdk = getAdsSdk();
    if (!sdk) {
      throw new Error("[toss-ad] Call initialize() before attaching an ad.");
    }
    if (!sdk.banner) {
      throw new Error("[toss-ad] Loaded TossAdsSpaceKit does not support banner ads.");
    }
    const element = typeof target === "string" ? document.querySelector(target) : target;
    if (!element) {
      throw new Error(`[toss-ad] Failed to find target element: ${target}`);
    }
    const slotOptions = {
      spaceId,
      autoLoad: true,
      theme: options.theme,
      padding: options.padding,
      callbacks: wrapCallbacks(normalizedAdGroupId, options.callbacks)
    };
    sdk.banner.createSlot(element, slotOptions);
  } catch (error) {
    rejectAttached(error);
  }
}
function ensureAttachStyles(container) {
  const documentRef = container.ownerDocument;
  if (!documentRef) {
    return;
  }
  if (documentRef.getElementById(ATTACH_STYLE_ID)) {
    return;
  }
  const style = documentRef.createElement("style");
  style.id = ATTACH_STYLE_ID;
  style.textContent = `
    .${ATTACH_CLASS_NAME},
    .${ATTACH_CLASS_NAME} * {
      font-family: ${ATTACH_AD_FONT_FAMILY};
      font-style: normal;
    }
    .${ATTACH_CLASS_NAME} { background: #ffffff; }
    .${ATTACH_CLASS_NAME}.toss-ads-tone-grey { background: #f2f4f7; }
    @media (prefers-color-scheme: dark) {
      .${ATTACH_CLASS_NAME} { background: #17171c; }
      .${ATTACH_CLASS_NAME}.toss-ads-tone-grey { background: #101013; }
    }
    .${ATTACH_CLASS_NAME}.toss-ads-theme-light { background: #ffffff; }
    .${ATTACH_CLASS_NAME}.toss-ads-theme-light.toss-ads-tone-grey { background: #f2f4f7; }
    .${ATTACH_CLASS_NAME}.toss-ads-theme-dark { background: #17171c; }
    .${ATTACH_CLASS_NAME}.toss-ads-theme-dark.toss-ads-tone-grey { background: #101013; }
  `;
  const styleContainer = documentRef.head ?? documentRef.body ?? documentRef.documentElement;
  if (!styleContainer) {
    return;
  }
  styleContainer.appendChild(style);
}
function removeStaleAttachedBannerWrappers(container) {
  Array.from(container.children).forEach((child) => {
    if (child instanceof HTMLElement && child.getAttribute(ATTACH_WRAPPER_ATTRIBUTE) === "true") {
      container.removeChild(child);
    }
  });
}
function attachBanner(adGroupId, target, options = {}) {
  const {
    callbacks,
    theme = DEFAULT_ATTACH_THEME,
    tone = DEFAULT_ATTACH_TONE,
    variant = DEFAULT_ATTACH_VARIANT
  } = options;
  const normalizedAdGroupId = normalizeAdGroupId(adGroupId);
  const rejectAttached = (error) => {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    callbacks?.onAdFailedToRender?.({
      slotId: "",
      adGroupId: normalizedAdGroupId,
      adMetadata: {},
      error: { code: 0, message: normalizedError.message }
    });
  };
  const wrappedCallbacks = wrapCallbacks(normalizedAdGroupId, callbacks);
  try {
    const spaceId = normalizedAdGroupId;
    if (spaceId.length === 0) {
      throw createInvalidAdGroupIdError();
    }
    const sdk = getAdsSdk();
    if (!sdk) {
      throw new Error("[toss-ad] Call initialize() before attaching an ad.");
    }
    if (!sdk.banner) {
      throw new Error("[toss-ad] Loaded TossAdsSpaceKit does not support banner ads.");
    }
    const container = typeof target === "string" ? document.querySelector(target) : target;
    if (!container) {
      throw new Error(`[toss-ad] Failed to find target element: ${target}`);
    }
    return getOrCreateAttachedBanner(container, () => {
      const wrapper = document.createElement("div");
      wrapper.style.width = "100%";
      wrapper.style.height = "100%";
      wrapper.style.boxSizing = "border-box";
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.fontFamily = ATTACH_AD_FONT_FAMILY;
      wrapper.style.fontStyle = "normal";
      wrapper.style.justifyContent = "center";
      wrapper.style.overflow = "hidden";
      wrapper.setAttribute(ATTACH_WRAPPER_ATTRIBUTE, "true");
      if (variant === "card") {
        wrapper.style.padding = "0 10px";
      }
      const element = document.createElement("div");
      element.classList.add(ATTACH_CLASS_NAME);
      element.style.fontFamily = ATTACH_AD_FONT_FAMILY;
      element.style.fontStyle = "normal";
      if (tone === "grey") {
        element.classList.add("toss-ads-tone-grey");
      }
      if (theme === "light") {
        element.classList.add("toss-ads-theme-light");
      } else if (theme === "dark") {
        element.classList.add("toss-ads-theme-dark");
      }
      if (variant === "card") {
        element.style.borderRadius = "16px";
        element.style.overflow = "hidden";
      }
      wrapper.appendChild(element);
      let isAttached = false;
      let slot = null;
      try {
        ensureAttachStyles(container);
        removeStaleAttachedBannerWrappers(container);
        container.appendChild(wrapper);
        isAttached = true;
        const slotOptions = {
          spaceId,
          autoLoad: true,
          theme: theme === "auto" ? void 0 : theme,
          renderPadding: (styleId) => {
            if (styleId === LIST_BANNER_STYLE_ID) {
              return DEFAULT_ATTACH_PADDING_BANNER;
            }
            return DEFAULT_ATTACH_PADDING_NATIVE_IMAGE;
          },
          callbacks: wrappedCallbacks
        };
        slot = sdk.banner.createSlot(element, slotOptions);
      } catch (error) {
        if (isAttached && wrapper.parentNode) {
          wrapper.parentNode.removeChild(wrapper);
        }
        throw error;
      }
      return {
        destroy() {
          slot?.destroy();
          if (isAttached && wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
          }
          isAttached = false;
        }
      };
    });
  } catch (error) {
    rejectAttached(error);
    return {
      destroy() {
      }
    };
  }
}
function destroy(slotId) {
  const sdk = getAdsSdk();
  if (!sdk?.banner) {
    return;
  }
  sdk.banner.destroy(slotId);
}
function destroyAll() {
  const sdk = getAdsSdk();
  if (!sdk?.banner) {
    return;
  }
  sdk.banner.destroyAll();
  resetAttachedBannerRegistry();
}
function wrapCallbacks(adGroupId, callbacks) {
  if (!callbacks) {
    return void 0;
  }
  const mapEvent = (payload) => {
    const next = { ...payload ?? {} };
    next.adGroupId = next.adGroupId ?? next.spaceId ?? adGroupId;
    delete next.spaceId;
    return next;
  };
  return {
    onAdRendered: (payload) => callbacks.onAdRendered?.(mapEvent(payload)),
    onAdViewable: (payload) => callbacks.onAdViewable?.(mapEvent(payload)),
    onAdClicked: (payload) => callbacks.onAdClicked?.(mapEvent(payload)),
    onAdImpression: (payload) => {
      tossAdEventLog({
        log_name: "display_ads_all::impression__1px_banner",
        log_type: "event",
        params: {
          event_type: "impression",
          schema_id: 1812034,
          request_id: payload?.adMetadata?.requestId ?? ""
        }
      });
      callbacks.onAdImpression?.(mapEvent(payload));
    },
    // 에러 트래킹은 응답을 소유한 createCustomAdFetcher가 담당한다. 콜백은 publisher 전달만.
    // 응답 수신 후 에러의 mediationId는 SDK(ads-sdk/web)가 error에 실어주므로 그대로 전달한다.
    onAdFailedToRender: (payload) => callbacks.onAdFailedToRender?.({
      ...mapEvent(payload),
      error: payload?.error ?? { code: 0, message: "UNKNOWN" }
    }),
    onNoFill: (payload) => callbacks.onNoFill?.(mapEvent(payload))
  };
}
var NativeWindow2, nativeWindow2, createEventId2, deserializeError2, Storage, SEMVER_REGEX, isWildcard, tryParse, coerceTypes, compareValues, parseVersion, compareSegments, compareVersions, IAP, _getSafeAreaInsets, _getSafeAreaInsets2, GoogleAdMob, env, deploymentId, brandDisplayName, brandIcon, brandPrimaryColor, partner, requestPermission2, getPermission2, openPermissionDialog2, fetchAlbumPhotos2, fetchContacts2, getCurrentLocation2, openCamera2, setClipboardText2, getClipboardText2, getPermission22, openPermissionDialog22, startUpdateLocation2, loadFullScreenAd, showFullScreenAd, attachedBannerRegistry, ERROR_CODES, NON_ERROR_STATUSES, API_RESULT_ERROR_CODE_MAP, AD_STATUS_ERROR_CODE_MAP, tossAdEventLog, BANNER_ERROR_LOG_NAME, APPS_IN_TOSS_AD_SPEC_VERSION, FETCH_APPS_IN_TOSS_AD_DEVICE_MACRO, TOSS_APP_BUNDLE_IDS, LIST_BANNER_STYLE_ID, NATIVE_IMAGE_STYLE_ID, AVAILABLE_STYLE_IDS, SUPPORTED_STYLE_IDS, openURL2, DEFAULT_SDK_URL, DEFAULT_TIMEOUT_MS, pendingLoad, package_default, SDK_VERSION, fetchTossAd, fetchAppsInTossAd, getPlatformOS2, getTossAppVersion2, WEB_SDK_ID, INVALID_AD_GROUP_ID_ERROR_MESSAGE, pendingLoad2, DEFAULT_ATTACH_PADDING_BANNER, DEFAULT_ATTACH_PADDING_NATIVE_IMAGE, DEFAULT_ATTACH_THEME, DEFAULT_ATTACH_TONE, DEFAULT_ATTACH_VARIANT, ATTACH_CLASS_NAME, ATTACH_STYLE_ID, ATTACH_WRAPPER_ATTRIBUTE, ATTACH_AD_FONT_FAMILY, TossAds, getServerTime2, requestReview2, getDeclaredAgeRange2;
var init_dist3 = __esm({
  "node_modules/@apps-in-toss/web-bridge/dist/index.js"() {
    init_bridge();
    init_dist2();
    init_dist2();
    init_dist2();
    init_dist2();
    init_dist2();
    init_dist2();
    init_dist2();
    init_dist2();
    NativeWindow2 = class {
      get _window() {
        if (typeof window !== "undefined") {
          return window;
        }
        return {
          ReactNativeWebView: {
            postMessage: () => {
            }
          },
          __GRANITE_NATIVE_EMITTER: {
            on: () => () => {
            }
          },
          __CONSTANT_HANDLER_MAP: {}
        };
      }
      postMessage(message) {
        const webView = this._window.ReactNativeWebView;
        if (!webView) {
          throw new Error("ReactNativeWebView is not available in browser environment");
        }
        webView.postMessage(JSON.stringify(message));
      }
      on(event, callback) {
        const emitter = this._window.__GRANITE_NATIVE_EMITTER;
        if (!emitter) {
          throw new Error("__GRANITE_NATIVE_EMITTER is not available");
        }
        return emitter.on(event, callback);
      }
      getConstant(method) {
        const constantHandlerMap = this._window.__CONSTANT_HANDLER_MAP;
        if (constantHandlerMap && method in constantHandlerMap) {
          return constantHandlerMap[method];
        }
        throw new Error(`${method} is not a constant handler`);
      }
    };
    nativeWindow2 = new NativeWindow2();
    createEventId2 = () => Math.random().toString(36).substring(2, 15);
    deserializeError2 = (value) => {
      if (value && value.__isError) {
        const err = new Error(value.message);
        for (const [key, val] of Object.entries(value)) {
          err[key] = val;
        }
        return err;
      }
      return value;
    };
    Storage = {
      /**
       * @public
       * @category 저장소
       * @name getItem
       * @description 모바일 앱의 로컬 저장소에서 문자열 데이터를 가져와요. 주로 앱이 종료되었다가 다시 시작해도 데이터가 유지되어야 하는 경우에 사용해요.
       * @param {string} key - 가져올 아이템의 키를 입력해요.
       * @returns {Promise<string | null>} 지정한 키에 저장된 문자열 값을 반환해요. 값이 없으면 `null`을 반환해요.
       * @example
       *
       * ### `my-key`에 저장된 아이템 가져오기
       * ```ts
       * const value = await Storage.getItem('my-key');
       * console.log(value); // 'value'
       * ```
       */
      getItem: createAsyncBridge2("getStorageItem"),
      /**
       * @public
       * @category 저장소
       * @name setItem
       * @description 모바일 앱의 로컬 저장소에 문자열 데이터를 저장해요. 주로 앱이 종료되었다가 다시 시작해도 데이터가 유지되어야 하는 경우에 사용해요.
       * @param {string} key - 저장할 아이템의 키를 입력해요.
       * @param {string} value - 저장할 아이템의 값을 입력해요.
       * @returns {Promise<void>} 아이템을 성공적으로 저장하면 아무 값도 반환하지 않아요.
       * @example
       *
       * ### `my-key`에 아이템 저장하기
       * ```ts
       * import { Storage } from '@apps-in-toss/framework';
       *
       * await Storage.setItem('my-key', 'value');
       * ```
       */
      setItem: createAsyncBridge2("setStorageItem"),
      /**
       * @public
       * @category 저장소
       * @name removeItem
       * @description 모바일 앱의 로컬 저장소에서 특정 키에 해당하는 아이템을 삭제해요.
       * @param {string} key - 삭제할 아이템의 키를 입력해요.
       * @returns {Promise<void>} 아이템을 삭제하면 아무 값도 반환하지 않아요.
       * @example
       *
       * ### `my-key`에 저장된 아이템 삭제하기
       * ```ts
       * import { Storage } from '@apps-in-toss/framework';
       *
       * await Storage.removeItem('my-key');
       * ```
       */
      removeItem: createAsyncBridge2("removeStorageItem"),
      /**
       * @public
       * @category 저장소
       * @name clearItems
       * @description 모바일 앱의 로컬 저장소의 모든 아이템을 삭제해요.
       * @returns {Promise<void>} 아이템을 삭제하면 아무 값도 반환하지 않고 저장소가 초기화돼요.
       * @example
       *
       * ### 저장소 초기화하기
       * ```ts
       * import { Storage } from '@apps-in-toss/framework';
       *
       * await Storage.clearItems();
       * ```
       */
      clearItems: createAsyncBridge2("clearItems")
    };
    SEMVER_REGEX = /^[v^~<>=]*?(\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+))?(?:-([\da-z\\-]+(?:\.[\da-z\\-]+)*))?(?:\+[\da-z\\-]+(?:\.[\da-z\\-]+)*)?)?)?$/i;
    isWildcard = (val) => ["*", "x", "X"].includes(val);
    tryParse = (val) => {
      const num = parseInt(val, 10);
      return isNaN(num) ? val : num;
    };
    coerceTypes = (a, b) => {
      return typeof a === typeof b ? [a, b] : [String(a), String(b)];
    };
    compareValues = (a, b) => {
      if (isWildcard(a) || isWildcard(b)) {
        return 0;
      }
      const [aVal, bVal] = coerceTypes(tryParse(a), tryParse(b));
      if (aVal > bVal) {
        return 1;
      }
      if (aVal < bVal) {
        return -1;
      }
      return 0;
    };
    parseVersion = (version) => {
      if (typeof version !== "string") {
        throw new TypeError("Invalid argument: expected a string");
      }
      const match = version.match(SEMVER_REGEX);
      if (!match) {
        throw new Error(`Invalid semver: '${version}'`);
      }
      const [, major, minor, patch, build, preRelease] = match;
      return [major, minor, patch, build, preRelease];
    };
    compareSegments = (a, b) => {
      const maxLength = Math.max(a.length, b.length);
      for (let i = 0; i < maxLength; i++) {
        const segA = a[i] ?? "0";
        const segB = b[i] ?? "0";
        const result = compareValues(segA, segB);
        if (result !== 0) {
          return result;
        }
      }
      return 0;
    };
    compareVersions = (v1, v2) => {
      const seg1 = parseVersion(v1);
      const seg2 = parseVersion(v2);
      const preRelease1 = seg1.pop();
      const preRelease2 = seg2.pop();
      const mainCompare = compareSegments(seg1, seg2);
      if (mainCompare !== 0) {
        return mainCompare;
      }
      if (preRelease1 && preRelease2) {
        return compareSegments(preRelease1.split("."), preRelease2.split("."));
      }
      if (preRelease1) {
        return -1;
      }
      if (preRelease2) {
        return 1;
      }
      return 0;
    };
    IAP = {
      /**
       * @public
       * @category 인앱결제
       * @name createOneTimePurchaseOrder
       * @description
       * 특정 인앱결제 주문서 페이지로 이동해요. 사용자가 상품 구매 버튼을 누르는 상황 등에 사용할 수 있어요. 사용자의 결제는 이동한 페이지에서 진행돼요. 만약 결제 중에 에러가 발생하면 에러 유형에 따라 에러 페이지로 이동해요.
       * @param {IapCreateOneTimePurchaseOrderOptions} params - 인앱결제를 생성할 때 필요한 정보예요.
       * @returns {() => void} 앱브릿지 cleanup 함수를 반환해요. 인앱결제 기능이 끝나면 반드시 이 함수를 호출해서 리소스를 해제해야 해요.
       *
       * @throw {code: "INVALID_PRODUCT_ID"} - 유효하지 않은 상품 ID이거나, 해당 상품이 존재하지 않을 때 발생해요.
       * @throw {code: "PAYMENT_PENDING"} - 사용자가 요청한 결제가 아직 승인을 기다리고 있을 때 발생해요.
       * @throw {code: "NETWORK_ERROR"} - 서버 내부 문제로 요청을 처리할 수 없을 때 발생해요.
       * @throw {code: "INVALID_USER_ENVIRONMENT"} - 특정 기기, 계정 또는 설정 환경에서 구매할 수 없는 상품일 때 발생해요.
       * @throw {code: "ITEM_ALREADY_OWNED"} - 사용자가 이미 구매한 상품을 다시 구매하려고 할 때 발생해요.
       * @throw {code: "APP_MARKET_VERIFICATION_FAILED"} - 사용자가 결제를 완료했지만, 앱스토어에서 사용자 정보 검증에 실패했을 때 발생해요. 사용자가 앱스토어에 문의해서 환불을 요청해야해요.
       * @throw {code: "TOSS_SERVER_VERIFICATION_FAILED"} - 사용자가 결제를 완료했지만, 서버 전송에 실패해서 결제 정보를 저장할 수 없을 때 발생해요.
       * @throw {code: "INTERNAL_ERROR"} - 서버 내부 문제로 요청을 처리할 수 없을 때 발생해요.
       * @throw {code: "KOREAN_ACCOUNT_ONLY"} - iOS 환경에서 사용자의 계정이 한국 계정이 아닐 때 발생해요.
       * @throw {code: "USER_CANCELED"} - 사용자가 결제를 완료하지 않고 주문서 페이지를 이탈했을 때 발생해요.
       * @throw {code: "PRODUCT_NOT_GRANTED_BY_PARTNER"} - 파트너사의 상품 지급이 실패했을 때 발생해요.
       */
      createOneTimePurchaseOrder: (params) => {
        const isIAPSupported = isMinVersionSupported({
          android: "5.219.0",
          ios: "5.219.0"
        });
        const noop = () => {
        };
        if (!isIAPSupported) {
          return noop;
        }
        const isProcessProductGrantSupported = isMinVersionSupported({
          android: "5.231.1",
          ios: "5.230.0"
        });
        const { options, onEvent, onError } = params;
        const sku = options.sku ?? options.productId;
        if (!isProcessProductGrantSupported) {
          const v1 = () => {
            createAsyncBridge2(
              "iapCreateOneTimePurchaseOrder"
            )({
              productId: sku
            }).then((response) => {
              Promise.resolve(options.processProductGrant({ orderId: response.orderId })).then(() => {
                onEvent({ type: "success", data: response });
              }).catch((error) => {
                onError(error);
              });
            }).catch((error) => {
              onError(error);
            });
            return noop;
          };
          return v1();
        }
        const unregisterCallbacks = createEventBridge2("requestOneTimePurchase")({
          options: { sku },
          onEvent: async (event) => {
            if (event.type === "purchased") {
              const isProductGranted = await options.processProductGrant({ orderId: event.data.orderId });
              await processProductGrant({
                orderId: event.data.orderId,
                isProductGranted
              }).catch(onError);
            } else {
              onEvent(event);
            }
          },
          onError: (error) => {
            onError(error);
          }
        });
        return unregisterCallbacks;
      },
      /**
       * @public
       * @category 인앱결제
       * @name createSubscriptionPurchaseOrder
       * @description
       * 구독 인앱결제 주문서 페이지로 이동해요. 사용자가 구독 상품 구매 버튼을 누르는 상황 등에 사용할 수 있어요.
       * @param {CreateSubscriptionPurchaseOrderOptions} params - 구독 인앱결제를 생성할 때 필요한 정보예요.
       * @returns {() => void} 앱브릿지 cleanup 함수를 반환해요. 인앱결제 기능이 끝나면 반드시 이 함수를 호출해서 리소스를 해제해야 해요.
       *
       * ```tsx
       * import { IAP } from "@apps-in-toss/web-framework";
       * import { useCallback } from "react";
       *
       * interface Props {
       *   sku: string;
       *   offerId?: string;
       * }
       *
       * function SubscriptionPurchaseButton({ sku, offerId }: Props) {
       *   const handleClick = useCallback(async () => {
       *     const cleanup = IAP.createSubscriptionPurchaseOrder({
       *       options: {
       *         sku,
       *         offerId,
       *         processProductGrant: ({ orderId, subscriptionId }) => {
       *           // 상품 지급 로직 작성
       *           return true; // 상품 지급 여부
       *         },
       *       },
       *       onEvent: (event) => {
       *         console.log(event);
       *         cleanup();
       *       },
       *       onError: (error) => {
       *         console.error(error);
       *         cleanup();
       *       },
       *     });
       *   }, [sku, offerId]);
       *
       *   return <button onClick={handleClick}>구독하기</button>;
       * }
       * ```
       */
      createSubscriptionPurchaseOrder: (params) => {
        const isSupported = isMinVersionSupported({
          android: "5.248.0",
          ios: "5.249.0"
        });
        const noop = () => {
        };
        if (!isSupported) {
          return noop;
        }
        const { options, onEvent, onError } = params;
        const { sku, offerId, processProductGrant: handleProcessProductGrant } = options;
        const unregisterCallbacks = createEventBridge2("requestSubscriptionPurchase")({
          options: { sku, offerId: offerId ?? null },
          onEvent: async (event) => {
            if (event.type === "purchased") {
              const isProductGranted = await handleProcessProductGrant({
                orderId: event.data.orderId,
                subscriptionId: event.data.subscriptionId
              });
              await processProductGrant({
                orderId: event.data.orderId,
                isProductGranted
              }).catch(onError);
            } else {
              onEvent(event);
            }
          },
          onError: (error) => {
            onError(error);
          }
        });
        return unregisterCallbacks;
      },
      /**
       * @public
       * @category 인앱결제
       * @name getProductItemList
       * @description 인앱결제로 구매할 수 있는 상품 목록을 가져와요. 상품 목록 화면에 진입할 때 호출해요.
       * @returns {Promise<{ products: IapProductListItem[] } | undefined>} 상품 목록을 포함한 객체를 반환해요. 앱 버전이 최소 지원 버전(안드로이드 5.219.0, iOS 5.219.0)보다 낮으면 `undefined`를 반환해요.
       */
      getProductItemList: createAsyncBridge2("iapGetProductItemList"),
      /**
       * @public
       * @category 인앱결제
       * @name getPendingOrders
       * @description 대기 중인 주문 목록을 가져와요. 이 함수를 사용하면 결제가 아직 완료되지 않은 주문 정보를 확인할 수 있어요.
       * @returns {Promise<{ orders: { orderId: string; sku: string; paymentCompletedDate: string; }[]}}>} 대기 중인 주문의 배열을 반환해요. 앱 버전이 최소 지원 버전(안드로이드 5.234.0, iOS 5.231.0)보다 낮으면 `undefined`를 반환해요.
       *
       * @example
       * ### 대기 중인 주문 목록 가져오기
       * ```typescript
       * import { IAP } from '@apps-in-toss/web-framework';
       *
       * async function fetchOrders() {
       *   try {
       *     const pendingOrders = await IAP.getPendingOrders();
       *     return pendingOrders;
       *   } catch (error) {
       *     console.error(error);
       *   }
       * }
       * ```
       */
      getPendingOrders: createAsyncBridge2(
        "getPendingOrders"
      ),
      /**
       * @public
       * @category 인앱결제
       * @name getCompletedOrRefundedOrders
       * @description 인앱결제로 구매하거나 환불한 주문 목록을 가져와요.
       * @returns {Promise<CompletedOrRefundedOrdersResult>} 페이지네이션을 포함한 주문 목록 객체를 반환해요. 앱 버전이 최소 지원 버전(안드로이드 5.231.0, iOS 5.231.0)보다 낮으면 `undefined`를 반환해요.
       *
       * @example
       * ```typescript
       * import { IAP } from "@apps-in-toss/web-framework";
       *
       * async function fetchOrders() {
       *   try {
       *     const response =  await IAP.getCompletedOrRefundedOrders();
       *     return response;
       *   } catch (error) {
       *     console.error(error);
       *   }
       * }
       * ```
       */
      getCompletedOrRefundedOrders: createAsyncBridge2("getCompletedOrRefundedOrders"),
      /**
       * @public
       * @category 인앱결제
       * @name completeProductGrant
       * @description 상품 지급 처리를 완료했다는 메시지를 앱에 전달해요. 이 함수를 사용하면 결제가 완료된 주문의 상품 지급이 정상적으로 완료되었음을 알릴 수 있어요.
       * @param {{ params: { orderId: string } }} params 결제가 완료된 주문 정보를 담은 객체예요.
       * @param {string} params.orderId 주문의 고유 ID예요. 상품 지급을 완료할 주문을 지정할 때 사용해요.
       * @returns {Promise<boolean>} 상품 지급이 완료됐는지 여부를 반환해요. 앱 버전이 최소 지원 버전(안드로이드 5.233.0, iOS 5.233.0)보다 낮으면 `undefined`를 반환해요.
       *
       * @example
       * ### 결제를 성공한 뒤 상품을 지급하는 예시
       * ```typescript
       * import { IAP } from '@apps-in-toss/web-framework';
       *
       * async function handleGrantProduct(orderId: string) {
       *   try {
       *     await IAP.completeProductGrant({ params: { orderId } });
       *   } catch (error) {
       *     console.error(error);
       *   }
       * }
       * ```
       */
      completeProductGrant: createAsyncBridge2("completeProductGrant"),
      getSubscriptionInfo: createAsyncBridge2(
        "getSubscriptionInfo"
      )
    };
    _getSafeAreaInsets = createConstantBridge2("getSafeAreaInsets");
    _getSafeAreaInsets2 = createConstantBridge2("getSafeAreaInsets");
    GoogleAdMob = {
      /**
       * @public
       * @category 광고
       * @name loadAppsInTossAdMob
       * @description 광고를 미리 불러와서, 광고가 필요한 시점에 바로 보여줄 수 있도록 준비하는 함수예요.
       * @param {LoadAdMobParams} params 광고를 불러올 때 사용할 설정 값이에요. 광고 그룹 ID와 광고의 동작에 대한 콜백을 설정할 수 있어요.
       * @param {LoadAdMobOptions} params.options 광고를 불러올 때 전달할 옵션 객체예요.
       * @param {string} params.options.adGroupId 광고 그룹 단위 ID예요. 콘솔에서 발급받은 ID를 입력해요.
       * @param {(event: LoadAdMobEvent) => void} [params.onEvent] 광고 관련 이벤트가 발생했을 때 호출돼요. (예시: 광고가 닫히거나 클릭됐을 때). 자세한 이벤트 타입은 [LoadAdMobEvent](/react-native/reference/native-modules/광고/LoadAdMobEvent.html)를 참고하세요.
       * @param {(reason: unknown) => void} [params.onError] 광고를 불러오지 못했을 때 호출돼요. (예시: 네트워크 오류나 지원하지 않는 환경일 때)
       * @property {() => boolean} [isSupported] 현재 실행 중인 앱(예: 토스 앱, 개발용 샌드박스 앱 등)에서 Google AdMob 광고 기능을 지원하는지 확인하는 함수예요. 기능을 사용하기 전에 지원 여부를 확인해야 해요.
       *
       * @example
       * ### 뷰 진입 시 광고 불러오기
       * ```tsx
       * import { GoogleAdMob } from '@apps-in-toss/framework';
       * import { useEffect } from 'react';
       * import { View, Text } from 'react-native';
       *
       * const AD_GROUP_ID = '<AD_GROUP_ID>';
       *
       * function Page() {
       *   useEffect(() => {
       *     if (GoogleAdMob.loadAppsInTossAdMob.isSupported() !== true) {
       *       return;
       *     }
       *
       *     const cleanup = GoogleAdMob.loadAppsInTossAdMob({
       *       options: {
       *         adGroupId: AD_GROUP_ID,
       *       },
       *       onEvent: (event) => {
       *         switch (event.type) {
       *           case 'loaded':
       *             console.log('광고 로드 성공', event.data);
       *             break;
       *         }
       *       },
       *       onError: (error) => {
       *         console.error('광고 불러오기 실패', error);
       *       },
       *     });
       *
       *     return cleanup;
       *   }, []);
       *
       *   return (
       *     <View>
       *       <Text>Page</Text>
       *     </View>
       *   );
       * }
       * ```
       */
      loadAppsInTossAdMob: Object.assign(createEventBridge2("loadAppsInTossAdMob"), {
        isSupported: createConstantBridge2("loadAppsInTossAdMob_isSupported")
      }),
      /**
       * @public
       * @category 광고
       * @name showAppsInTossAdMob
       * @description 광고를 사용자에게 노출해요. 이 함수는 `loadAppsInTossAdMob` 로 미리 불러온 광고를 실제로 사용자에게 노출해요.
       * @param {ShowAdMobParams} params 광고를 보여주기 위해 사용할 설정 값이에요. 광고 그룹 ID와과 광고의 동작에 대한 콜백을 설정할 수 있어요.
       * @param {ShowAdMobOptions} params.options 광고를 보여줄 때 전달할 옵션 객체예요.
       * @param {string} params.options.adUnitId 광고 그룹 단위 ID예요. `loadAppsInTossAdMob` 로 불러온 광고용 그룹 ID를 입력해요.
       * @param {(event: ShowAdMobEvent) => void} [params.onEvent] 광고 관련 이벤트가 발생했을 때 호출돼요. (예시: 광고 노출을 요청했을 때). 자세한 이벤트 타입은 [ShowAdMobEvent](/react-native/reference/native-modules/광고/ShowAdMobEvent.html)를 참고하세요.
       * @param {(reason: unknown) => void} [params.onError] 광고를 노출하지 못했을 때 호출돼요. (예시: 네트워크 오류나 지원하지 않는 환경일 때)
       * @property {() => boolean} [isSupported] 현재 실행 중인 앱(예: 토스 앱, 개발용 샌드박스 앱 등)에서 Google AdMob 광고 기능을 지원하는지 확인하는 함수예요. 기능을 사용하기 전에 지원 여부를 확인해야 해요.
       *
       * @example
       * ### 버튼 눌러 불러온 광고 보여주기
       * ```tsx
       * import { GoogleAdMob } from '@apps-in-toss/framework';
       * import { View, Text, Button } from 'react-native';
       *
       * const AD_GROUP_ID = '<AD_GROUP_ID>';
       *
       * function Page() {
       *   const handlePress = () => {
       *     if (GoogleAdMob.showAppsInTossAdMob.isSupported() !== true) {
       *       return;
       *     }
       *
       *     GoogleAdMob.showAppsInTossAdMob({
       *       options: {
       *         adGroupId: AD_GROUP_ID,
       *       },
       *       onEvent: (event) => {
       *         switch (event.type) {
       *           case 'requested':
       *             console.log('광고 보여주기 요청 완료');
       *             break;
       *
       *           case 'clicked':
       *             console.log('광고 클릭');
       *             break;
       *
       *           case 'dismissed':
       *             console.log('광고 닫힘');
       *             navigation.navigate('/examples/google-admob-interstitial-ad-landing');
       *             break;
       *
       *           case 'failedToShow':
       *             console.log('광고 보여주기 실패');
       *             break;
       *
       *           case 'impression':
       *             console.log('광고 노출');
       *             break;
       *
       *           case 'userEarnedReward':
       *             console.log('광고 보상 획득 unitType:', event.data.unitType);
       *             console.log('광고 보상 획득 unitAmount:', event.data.unitAmount);
       *             break;
       *
       *           case 'show':
       *             console.log('광고 컨텐츠 보여졌음');
       *             break;
       *         }
       *       },
       *       onError: (error) => {
       *         console.error('광고 보여주기 실패', error);
       *       },
       *     });
       *   }
       *
       *   return (
       *     <Button onPress={handlePress} title="광고 보기" />
       *   );
       * }
       * ```
       */
      showAppsInTossAdMob: Object.assign(createEventBridge2("showAppsInTossAdMob"), {
        isSupported: createConstantBridge2("showAppsInTossAdMob_isSupported")
      }),
      /**
       * @public
       * @category 광고
       * @name showAppsInTossAdMob
       * @description 이 함수는 `loadAppsInTossAdMob` 로 광고가 잘 불러와졌는지 확인해요.
       * @param {string} params.adUnitId 광고 그룹 단위 ID예요.
       * @property {() => boolean} [isSupported] 현재 실행 중인 앱(예: 토스 앱, 개발용 샌드박스 앱 등)에서 `isAppsInTossAdMobLoaded` 를 지원하는지 확인하는 함수예요. 기능을 사용하기 전에 지원 여부를 확인해야 해요.
       */
      isAppsInTossAdMobLoaded: Object.assign(
        createAsyncBridge2("isAppsInTossAdMobLoaded"),
        {
          isSupported: createConstantBridge2("isAppsInTossAdMobLoaded_isSupported")
        }
      )
    };
    env = {
      getDeploymentId: createConstantBridge2("getDeploymentId")
    };
    deploymentId = createConstantBridge2("deploymentId");
    brandDisplayName = createConstantBridge2("brandDisplayName");
    brandIcon = createConstantBridge2("brandIcon");
    brandPrimaryColor = createConstantBridge2("brandPrimaryColor");
    partner = {
      /**
       * @public
       * @category 파트너
       * @name addAccessoryButton
       * @description 상단 네비게이션의 악세서리 버튼을 추가해요. callback에 대한 정의는 `tdsEvent.addEventListener("navigationAccessoryEvent", callback)`를 참고해주세요.
       * @param {AddAccessoryButtonOptions} options - 악세서리 버튼의 고유 ID예요.
       * @returns {void} 악세서리 버튼을 추가했을 때 아무 값도 반환하지 않아요.
       * @example
       * ```tsx
       * import { partner } from '@apps-in-toss/framework';
       *
       * partner.addAccessoryButton({
          id: 'init-heart',
          title: '하트',
          icon: {
            name: 'icon-heart-mono',
          },
        });
       * ```
       */
      addAccessoryButton: createAsyncBridge2("addAccessoryButton"),
      /**
       * @public
       * @category 파트너
       * @name removeAccessoryButton
       * @description 상단 네비게이션의 악세서리 버튼을 제거해요.
       * @returns {void} 악세서리 버튼을 제거했을 때 아무 값도 반환하지 않아요.
       * @example
       * ```tsx
       * import { partner } from '@apps-in-toss/framework';
       *
       * partner.removeAccessoryButton();
       * ```
       */
      removeAccessoryButton: createAsyncBridge2("removeAccessoryButton")
    };
    requestPermission2 = createAsyncBridge2("requestPermission");
    getPermission2 = createAsyncBridge2("getPermission");
    openPermissionDialog2 = createAsyncBridge2("openPermissionDialog");
    fetchAlbumPhotos2 = createPermissionFunction({
      handler: (options) => {
        return createAsyncBridge2("fetchAlbumPhotos")(
          options
        );
      },
      permission: {
        name: "photos",
        access: "read"
      },
      error: FetchAlbumPhotosPermissionError
    });
    fetchContacts2 = createPermissionFunction({
      handler: (options) => {
        return createAsyncBridge2("fetchContacts")(options);
      },
      permission: {
        name: "contacts",
        access: "read"
      },
      error: FetchContactsPermissionError
    });
    getCurrentLocation2 = createPermissionFunction({
      handler: (options) => {
        return createAsyncBridge2(
          "getCurrentLocation"
        )(options);
      },
      permission: {
        name: "geolocation",
        access: "access"
      },
      error: GetCurrentLocationPermissionError
    });
    openCamera2 = createPermissionFunction({
      handler: (options) => {
        return createAsyncBridge2("openCamera")(options);
      },
      permission: {
        name: "camera",
        access: "access"
      },
      error: OpenCameraPermissionError
    });
    setClipboardText2 = createPermissionFunction({
      handler: (options) => {
        return createAsyncBridge2("setClipboardText")(
          options
        );
      },
      permission: {
        name: "clipboard",
        access: "write"
      },
      error: SetClipboardTextPermissionError
    });
    getClipboardText2 = createPermissionFunction({
      handler: () => {
        return createAsyncBridge2("getClipboardText")();
      },
      permission: {
        name: "clipboard",
        access: "read"
      },
      error: GetClipboardTextPermissionError
    });
    getPermission22 = createAsyncBridge2("getPermission");
    openPermissionDialog22 = createAsyncBridge2("openPermissionDialog");
    startUpdateLocation2 = (params) => {
      return createEventBridge2("updateLocationEvent")({
        ...params,
        onError: (error) => {
          const locationError = new StartUpdateLocationPermissionError();
          if (error instanceof Error && error.name === locationError.name) {
            return params.onError(locationError);
          }
          return params.onError(error);
        }
      });
    };
    startUpdateLocation2.getPermission = () => getPermission22({ name: "geolocation", access: "access" });
    startUpdateLocation2.openPermissionDialog = () => openPermissionDialog22({ name: "geolocation", access: "access" });
    loadFullScreenAd = Object.assign(
      createEventBridge2("loadFullScreenAd"),
      {
        isSupported: createConstantBridge2("loadFullScreenAd_isSupported")
      }
    );
    showFullScreenAd = Object.assign(
      createEventBridge2("showFullScreenAd"),
      {
        isSupported: createConstantBridge2("showFullScreenAd_isSupported")
      }
    );
    attachedBannerRegistry = /* @__PURE__ */ new WeakMap();
    ERROR_CODES = {
      NETWORK_ERROR: 1001,
      INVALID_REQUEST: 1002,
      NO_AD: 1003,
      ERROR: 1004,
      INVALID_SPACE: 1005,
      SDK_NOT_INITIALIZED: 1007,
      HTTP_TIMEOUT: 1008,
      EXECUTION_FAIL: 1009,
      INTERRUPTED: 1010,
      FAIL: 1011,
      BLOCKED: 1012,
      TIMEOUT: 1013,
      LIMITED_AD: 1014,
      CONSENT_REQUIRED: 1015,
      TEST_MODE: 1016,
      INTERNAL_ERROR: 1017
    };
    NON_ERROR_STATUSES = /* @__PURE__ */ new Set(["OK", "TEST_MODE", "NO_AD"]);
    API_RESULT_ERROR_CODE_MAP = {
      HTTP_TIMEOUT: ERROR_CODES.HTTP_TIMEOUT,
      NETWORK_ERROR: ERROR_CODES.NETWORK_ERROR,
      EXECUTION_FAIL: ERROR_CODES.EXECUTION_FAIL,
      INTERRUPTED: ERROR_CODES.INTERRUPTED,
      INTERNAL_ERROR: ERROR_CODES.ERROR,
      FAIL: ERROR_CODES.FAIL
    };
    AD_STATUS_ERROR_CODE_MAP = {
      BLOCKED: ERROR_CODES.BLOCKED,
      ERROR: ERROR_CODES.ERROR,
      TIMEOUT: ERROR_CODES.TIMEOUT,
      INVALID_SPACE: ERROR_CODES.INVALID_SPACE,
      INVALID_REQUEST: ERROR_CODES.INVALID_REQUEST,
      LIMITED_AD: ERROR_CODES.LIMITED_AD,
      CONSENT_REQUIRED: ERROR_CODES.CONSENT_REQUIRED
    };
    tossAdEventLog = createAsyncBridge2("tossAdEventLog");
    BANNER_ERROR_LOG_NAME = "display_ads_all::error__banner";
    APPS_IN_TOSS_AD_SPEC_VERSION = "1.4.1";
    FETCH_APPS_IN_TOSS_AD_DEVICE_MACRO = "{{device}}";
    TOSS_APP_BUNDLE_IDS = {
      ios: "com.vivarepublica.cash",
      android: "viva.republica.toss"
    };
    LIST_BANNER_STYLE_ID = "1";
    NATIVE_IMAGE_STYLE_ID = "2";
    AVAILABLE_STYLE_IDS = [LIST_BANNER_STYLE_ID, NATIVE_IMAGE_STYLE_ID];
    SUPPORTED_STYLE_IDS = new Set(AVAILABLE_STYLE_IDS);
    openURL2 = createAsyncBridge2("openURL");
    DEFAULT_SDK_URL = "https://static.toss.im/ads/sdk/toss-ads-space-kit-3.1.0.js";
    DEFAULT_TIMEOUT_MS = 15e3;
    pendingLoad = null;
    package_default = {
      name: "@apps-in-toss/web-bridge",
      type: "module",
      version: "2.10.5",
      description: "Web Bridge for Apps In Toss",
      scripts: {
        typecheck: "tsc --noEmit",
        lint: "eslint .",
        build: "tsup"
      },
      main: "./dist/index.cjs",
      module: "./dist/index.js",
      types: "./dist/index.d.ts",
      exports: {
        ".": {
          import: {
            types: "./dist/index.d.ts",
            default: "./dist/index.js"
          },
          require: {
            types: "./dist/index.d.cts",
            default: "./dist/index.cjs"
          }
        }
      },
      files: [
        "dist"
      ],
      dependencies: {
        "@apps-in-toss/types": "workspace:*"
      },
      devDependencies: {
        "@apps-in-toss/bridge-core": "workspace:*",
        "@apps-in-toss/native-modules": "workspace:^",
        "@swc/core": "^1.12.7",
        picocolors: "^1.1.1",
        "ts-morph": "^26.0.0",
        tsup: "^8.5.0",
        typescript: "5.8.3",
        vitest: "^3.1.2"
      }
    };
    SDK_VERSION = package_default.version;
    fetchTossAd = Object.assign(createEventBridge2("fetchTossAd"), {
      isSupported: createConstantBridge2("fetchTossAd_isSupported")
    });
    fetchAppsInTossAd = Object.assign(createEventBridge2("fetchAppsInTossAd"), {
      isSupported: createConstantBridge2("fetchAppsInTossAd_isSupported")
    });
    getPlatformOS2 = createConstantBridge2("getPlatformOS");
    getTossAppVersion2 = createConstantBridge2("getTossAppVersion");
    WEB_SDK_ID = "108";
    INVALID_AD_GROUP_ID_ERROR_MESSAGE = "\uC798\uBABB\uB41C \uC694\uCCAD\uC774\uC5D0\uC694. \uD544\uC694\uD55C \uAC12\uC774 \uBE44\uC5B4 \uC788\uC5B4\uC694.";
    pendingLoad2 = null;
    DEFAULT_ATTACH_PADDING_BANNER = "16px 20px";
    DEFAULT_ATTACH_PADDING_NATIVE_IMAGE = "20px";
    DEFAULT_ATTACH_THEME = "auto";
    DEFAULT_ATTACH_TONE = "blackAndWhite";
    DEFAULT_ATTACH_VARIANT = "expanded";
    ATTACH_CLASS_NAME = "toss-ads-attach";
    ATTACH_STYLE_ID = "toss-ads-attach-style";
    ATTACH_WRAPPER_ATTRIBUTE = "data-toss-ads-attach-banner-wrapper";
    ATTACH_AD_FONT_FAMILY = '"Toss Product Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';
    TossAds = {
      initialize: Object.assign(initialize, {
        isSupported: fetchTossAd.isSupported
      }),
      /**
       * @deprecated attach는 더 이상 권장되지 않습니다. attachBanner를 사용해주세요.
       */
      attach: Object.assign(attach, {
        isSupported: fetchTossAd.isSupported
      }),
      attachBanner: Object.assign(attachBanner, {
        isSupported: fetchTossAd.isSupported
      }),
      destroy: Object.assign(destroy, {
        isSupported: fetchTossAd.isSupported
      }),
      destroyAll: Object.assign(destroyAll, {
        isSupported: fetchTossAd.isSupported
      })
    };
    getServerTime2 = Object.assign(createAsyncBridge2("getServerTime"), {
      isSupported: createConstantBridge2("getServerTime_isSupported")
    });
    requestReview2 = Object.assign(createAsyncBridge2("requestReview"), {
      isSupported: createConstantBridge2("requestReview_isSupported")
    });
    getDeclaredAgeRange2 = Object.assign(
      createAsyncBridge2("getDeclaredAgeRange"),
      {
        isSupported: createConstantBridge2("getDeclaredAgeRange_isSupported")
      }
    );
  }
});

// 카페 행사/ads.js
var require_ads = __commonJS({
  "\uCE74\uD398 \uD589\uC0AC/ads.js"() {
    init_dist3();
    var AD_CONFIG = {
      banner: "ait.v2.live.6ee2e927b62c4a18",
      interstitial: "ait.v2.live.de853f34f3674829",
      rewarded: "ait.v2.live.a1d0d9ff00454a96"
    };
    var interstitialReady = false;
    var rewardAdReady = false;
    var AD_BRAND_PROBABILITY = 0.25;
    function todayStr() {
      return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    }
    function loadInterstitial() {
      if (!loadFullScreenAd.isSupported || !loadFullScreenAd.isSupported()) return;
      loadFullScreenAd({
        options: { adGroupId: AD_CONFIG.interstitial },
        onEvent: (event) => {
          if (event.type === "loaded") interstitialReady = true;
        },
        onError: () => {
          interstitialReady = false;
        }
      });
    }
    function loadRewardAd() {
      if (!loadFullScreenAd.isSupported || !loadFullScreenAd.isSupported()) return;
      loadFullScreenAd({
        options: { adGroupId: AD_CONFIG.rewarded },
        onEvent: (event) => {
          if (event.type === "loaded") {
            rewardAdReady = true;
            document.getElementById("rewardAdBtn")?.classList.remove("hidden");
            document.getElementById("wishUnlockAdBtn")?.classList.remove("hidden");
          }
        },
        onError: () => {
          rewardAdReady = false;
        }
      });
    }
    function showInterstitial(onAfter) {
      if (!interstitialReady) {
        if (onAfter) onAfter();
        return;
      }
      showFullScreenAd({
        options: { adGroupId: AD_CONFIG.interstitial },
        onEvent: (event) => {
          if (event.type === "dismissed" || event.type === "failedToShow") {
            interstitialReady = false;
            loadInterstitial();
            if (onAfter) onAfter();
          }
        },
        onError: () => {
          if (onAfter) onAfter();
        }
      });
    }
    function requestRewardAd(onEarned, onDismiss) {
      if (!rewardAdReady) return false;
      showFullScreenAd({
        options: { adGroupId: AD_CONFIG.rewarded },
        onEvent: (event) => {
          if (event.type === "userEarnedReward") onEarned();
          if (event.type === "dismissed" || event.type === "failedToShow") {
            rewardAdReady = false;
            loadRewardAd();
            if (onDismiss) onDismiss();
          }
        },
        onError: () => {
          if (onDismiss) onDismiss();
        }
      });
      return true;
    }
    window.onNavigateToMap = function onNavigateToMap(url) {
      showInterstitial(() => {
        location.href = url;
      });
    };
    var exitAdShown = false;
    window.addEventListener("pagehide", () => {
      if (exitAdShown) return;
      exitAdShown = true;
      showInterstitial(null);
    });
    window.onBrandChanged = function onBrandChanged() {
      if (Math.random() >= AD_BRAND_PROBABILITY) return;
      showInterstitial(null);
    };
    window.watchRewardAdForWish = function watchRewardAdForWish() {
      const succeeded = requestRewardAd(
        () => {
          localStorage.setItem("cvs_wishUnlocked", todayStr());
          window.closeWishLimitModal?.();
          if (window._pendingLikeId) {
            const id = window._pendingLikeId;
            window._pendingLikeId = null;
            window.toggleLike?.(id);
          }
          window.showToast?.("\uAD11\uACE0 \uC2DC\uCCAD \uC644\uB8CC! \uC624\uB298 \uD558\uB8E8 \uCC1C \uBAA9\uB85D\uC744 \uBB34\uC81C\uD55C\uC73C\uB85C \uC0AC\uC6A9\uD560 \uC218 \uC788\uC5B4\uC694 \u{1F49D}");
        },
        () => {
          window.closeWishLimitModal?.();
        }
      );
      if (!succeeded) {
        localStorage.setItem("cvs_wishUnlocked", todayStr());
        window.closeWishLimitModal?.();
        if (window._pendingLikeId) {
          const id = window._pendingLikeId;
          window._pendingLikeId = null;
          window.toggleLike?.(id);
        }
      }
    };
    window.watchRewardAdForRadius = function watchRewardAdForRadius() {
      const succeeded = requestRewardAd(
        () => {
          window.setRadius?.(5e3);
          window.showToast?.("\uAD11\uACE0 \uC2DC\uCCAD \uC644\uB8CC! \uBC18\uACBD 5km \uAC80\uC0C9\uC774 \uC5F4\uB838\uC2B5\uB2C8\uB2E4 \u{1F5FA}\uFE0F");
        },
        () => {
          window.showToast?.("\uAD11\uACE0\uB97C \uB05D\uAE4C\uC9C0 \uC2DC\uCCAD\uD574\uC57C 5km \uAC80\uC0C9\uC774 \uC5F4\uB9BD\uB2C8\uB2E4.");
        }
      );
      if (!succeeded) {
        window.setRadius?.(5e3);
      }
    };
    window.tossShare = function tossShare(message) {
      return share({ message });
    };
    window.tossGetCurrentLocation = function tossGetCurrentLocation() {
      return getCurrentLocation2({ accuracy: Accuracy.Balanced });
    };
    function init() {
      if (!TossAds.initialize.isSupported || !TossAds.initialize.isSupported()) return;
      document.body.classList.add("in-toss-app");
      TossAds.initialize({
        callbacks: {
          onInitialized: () => {
            const slot = document.getElementById("adBannerSlot");
            if (slot) TossAds.attachBanner(AD_CONFIG.banner, slot);
            loadInterstitial();
            loadRewardAd();
          }
        }
      });
    }
    document.addEventListener("DOMContentLoaded", init);
  }
});
export default require_ads();
