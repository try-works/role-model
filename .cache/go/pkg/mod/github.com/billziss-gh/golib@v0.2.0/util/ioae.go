/*
 * ioae.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

package util

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"io"
	"io/ioutil"
	"os"
)

func ReadAeData(path string, key []byte) (data []byte, err error) {
	idata, err := ReadFunc(path, func(file *os.File) (interface{}, error) {
		c, err := aes.NewCipher(key)
		if nil != err {
			return nil, err
		}

		ae, err := cipher.NewGCM(c)
		if nil != err {
			return nil, err
		}

		data, err := ioutil.ReadAll(file)
		if nil != err {
			return nil, err
		}

		var nonce []byte
		if n := ae.NonceSize(); len(data) > n {
			nonce, data = data[:n], data[n:]
		}

		return ae.Open(data[:0], nonce, data, nil)
	})

	if nil == err {
		data = idata.([]byte)
	}

	return
}

func WriteAeData(path string, perm os.FileMode, data []byte, key []byte) (err error) {
	return WriteFunc(path, perm, func(file *os.File) error {
		c, err := aes.NewCipher(key)
		if nil != err {
			return err
		}

		ae, err := cipher.NewGCM(c)
		if nil != err {
			return err
		}

		nonce := make([]byte, ae.NonceSize())
		_, err = rand.Read(nonce)
		if nil != err {
			return err
		}

		data = ae.Seal(nil, nonce, data, nil)

		n, err := file.Write(nonce)
		if nil == err && n < len(nonce) {
			return io.ErrShortWrite
		}

		n, err = file.Write(data)
		if nil == err && n < len(data) {
			err = io.ErrShortWrite
		}

		return err
	})
}
