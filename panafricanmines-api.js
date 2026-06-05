/*
 * PanAfricanMines — browser API client
 * ------------------------------------
 * A tiny, dependency-free wrapper around the backend API for the existing
 * single-page site. Drop this file next to your HTML and include it BEFORE the
 * page's own <script>:
 *
 *   <script src="panafricanmines-api.js"></script>
 *
 * Then set the base URL (see PamAPI.configure) and use the methods below.
 * Every method returns a Promise. See INTEGRATION.md for how to wire each one
 * into the current S.* state model.
 */
(function (global) {
  'use strict';

  var BASE = '/api/v1'; // same-origin default; override with PamAPI.configure()
  var token = null;

  // Persist the operator token across reloads (back-office only).
  try {
    token = global.localStorage ? global.localStorage.getItem('pam_token') : null;
  } catch (e) {
    token = null;
  }

  function setToken(t) {
    token = t || null;
    try {
      if (!global.localStorage) return;
      if (token) global.localStorage.setItem('pam_token', token);
      else global.localStorage.removeItem('pam_token');
    } catch (e) {
      /* ignore storage errors (private mode, etc.) */
    }
  }

  function qs(params) {
    if (!params) return '';
    var parts = [];
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null || v === '' || v === 'All') return;
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });
    return parts.length ? '?' + parts.join('&') : '';
  }

  async function request(method, path, body, auth) {
    var headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && token) headers['Authorization'] = 'Bearer ' + token;

    var res = await fetch(BASE + path, {
      method: method,
      headers: headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    var data = null;
    var text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = text;
      }
    }

    if (!res.ok) {
      var message =
        (data && data.error && data.error.message) ||
        (data && data.message) ||
        ('Request failed (' + res.status + ')');
      var err = new Error(message);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  }

  var PamAPI = {
    /**
     * Point the client at your backend.
     *   PamAPI.configure({ baseUrl: 'https://api.panafricanmines.com/api/v1' })
     * If the API is served from the same origin under /api/v1 you can skip this.
     */
    configure: function (opts) {
      opts = opts || {};
      if (opts.baseUrl) BASE = opts.baseUrl.replace(/\/+$/, '');
      if (opts.token !== undefined) setToken(opts.token);
      return PamAPI;
    },

    // ---- Reference data (dropdowns / filters) --------------------------------
    getReference: function () {
      return request('GET', '/reference');
    },

    // ---- Public listings -----------------------------------------------------
    // filters: { q, commodity, country, licence, status, page, limit }
    listListings: function (filters) {
      return request('GET', '/listings' + qs(filters));
    },
    getListing: function (id) {
      return request('GET', '/listings/' + encodeURIComponent(id));
    },
    // Submit an asset. `payload` mirrors the "Sell an asset" form plus the
    // signed engagement letter:
    //   { assetType, commodity, country, location, licence, area, stage, price,
    //     email, engagementLetter: { accepted:true, signature, termsVersion } }
    createListing: function (payload) {
      return request('POST', '/listings', payload);
    },
    // Buyer "Request contact". data: { email, name, message }
    requestContact: function (id, data) {
      return request('POST', '/listings/' + encodeURIComponent(id) + '/contact-requests', data || {});
    },

    // ---- Market explorer -----------------------------------------------------
    getExplore: function () {
      return request('GET', '/explore');
    },

    // ---- Email alerts --------------------------------------------------------
    // alert: { email, commodity, country, licence }
    createAlert: function (alert) {
      return request('POST', '/alerts', alert);
    },
    listAlerts: function (email) {
      return request('GET', '/alerts' + qs({ email: email }));
    },
    deleteAlert: function (tokenStr) {
      return request('DELETE', '/alerts/' + encodeURIComponent(tokenStr));
    },

    // ---- Operator (back-office) ---------------------------------------------
    isLoggedIn: function () {
      return !!token;
    },
    login: async function (email, password) {
      var data = await request('POST', '/auth/login', { email: email, password: password });
      if (data && data.token) setToken(data.token);
      return data;
    },
    logout: function () {
      setToken(null);
    },
    me: function () {
      return request('GET', '/auth/me', undefined, true);
    },
    operatorStats: function () {
      return request('GET', '/operator/stats', undefined, true);
    },
    // query: { status, q, page, limit }
    operatorListings: function (query) {
      return request('GET', '/operator/listings' + qs(query), undefined, true);
    },
    operatorListing: function (id) {
      return request('GET', '/operator/listings/' + encodeURIComponent(id), undefined, true);
    },
    publish: function (id) {
      return request('POST', '/operator/listings/' + encodeURIComponent(id) + '/publish', {}, true);
    },
    decline: function (id, reason) {
      return request('POST', '/operator/listings/' + encodeURIComponent(id) + '/decline', { reason: reason || '' }, true);
    },
    offer: function (id) {
      return request('POST', '/operator/listings/' + encodeURIComponent(id) + '/offer', {}, true);
    },
    // transactionValue is optional; omit to use the listing's own price.
    close: function (id, transactionValue) {
      var body = transactionValue != null ? { transactionValue: transactionValue } : {};
      return request('POST', '/operator/listings/' + encodeURIComponent(id) + '/close', body, true);
    },
    operatorContactRequests: function (query) {
      return request('GET', '/operator/contact-requests' + qs(query), undefined, true);
    },
  };

  global.PamAPI = PamAPI;

  // CommonJS export for tooling/tests (harmless in the browser).
  if (typeof module !== 'undefined' && module.exports) module.exports = PamAPI;
})(typeof window !== 'undefined' ? window : this);
