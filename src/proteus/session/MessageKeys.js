/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

'use strict';

const CBOR = require('wire-webapp-cbor');

const ClassUtil = require('../util/ClassUtil');
const DontCallConstructor = require('../errors/DontCallConstructor');
const TypeUtil = require('../util/TypeUtil');

const CipherKey = require('../derived/CipherKey');
const MacKey = require('../derived/MacKey');

/** @module session */

/**
 * @class MessageKeys
 * @throws {DontCallConstructor}
 */
class MessageKeys {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /**
   * @param {!derived.CipherKey} cipher_key
   * @param {!derived.MacKey} mac_key
   * @param {!number} counter
   * @returns {MessageKeys} - `this`
   */
  static new(cipher_key, mac_key, counter) {
    TypeUtil.assert_is_instance(CipherKey, cipher_key);
    TypeUtil.assert_is_instance(MacKey, mac_key);
    TypeUtil.assert_is_integer(counter);

    const mk = ClassUtil.new_instance(MessageKeys);
    mk.cipher_key = cipher_key;
    mk.mac_key = mac_key;
    mk.counter = counter;
    return mk;
  }

  /**
   * @returns {Uint8Array}
   * @private
   */
  _counter_as_nonce() {
    const nonce = new ArrayBuffer(8);
    new DataView(nonce).setUint32(0, this.counter);
    return new Uint8Array(nonce);
  }

  /**
   * @param {!(string|Uint8Array)} plaintext
   * @returns {Uint8Array}
   */
  encrypt(plaintext) {
    return this.cipher_key.encrypt(plaintext, this._counter_as_nonce());
  }

  /**
   * @param {!Uint8Array} ciphertext
   * @returns {Uint8Array}
   */
  decrypt(ciphertext) {
    return this.cipher_key.decrypt(ciphertext, this._counter_as_nonce());
  }

  /**
   * @param {!CBOR.Encoder} e
   * @returns {CBOR.Encoder}
   */
  encode(e) {
    e.object(3);
    e.u8(0);
    this.cipher_key.encode(e);
    e.u8(1);
    this.mac_key.encode(e);
    e.u8(2);
    return e.u32(this.counter);
  }

  /**
   * @param {!CBOR.Decoder} d
   * @returns {MessageKeys}
   */
  static decode(d) {
    TypeUtil.assert_is_instance(CBOR.Decoder, d);

    const self = ClassUtil.new_instance(MessageKeys);

    const nprops = d.object();
    for (let i = 0; i <= nprops - 1; i++) {
      switch (d.u8()) {
        case 0:
          self.cipher_key = CipherKey.decode(d);
          break;
        case 1:
          self.mac_key = MacKey.decode(d);
          break;
        case 2:
          self.counter = d.u32();
          break;
        default:
          d.skip();
      }
    }

    TypeUtil.assert_is_instance(CipherKey, self.cipher_key);
    TypeUtil.assert_is_instance(MacKey, self.mac_key);
    TypeUtil.assert_is_integer(self.counter);

    return self;
  }
}

module.exports = MessageKeys;
