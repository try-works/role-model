/*
 * ioutil.go
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
	"crypto/rand"
	"encoding/hex"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"
)

func ReadFunc(path string, fn func(*os.File) (interface{}, error)) (data interface{}, err error) {
	file, err := os.OpenFile(path, os.O_RDONLY, 0)
	if nil != err {
		return
	}
	defer func() {
		file.Close()
	}()

	data, err = fn(file)
	return
}

func ReadData(path string) (data []byte, err error) {
	idata, err := ReadFunc(path, func(file *os.File) (interface{}, error) {
		return ioutil.ReadAll(file)
	})

	if nil == err {
		data = idata.([]byte)
	}

	return
}

func WriteFunc(path string, perm os.FileMode, fn func(*os.File) error) (err error) {
	var r [10]byte
	_, err = rand.Read(r[:])
	if nil != err {
		return
	}

	dirperm := os.FileMode(0)
	if 0 != perm&0700 {
		dirperm |= (perm & 0600) | 0100
	}
	if 0 != perm&0070 {
		dirperm |= (perm & 0040) | 0010
	}
	if 0 != perm&0007 {
		dirperm |= (perm & 0004) | 0001
	}

	err = os.MkdirAll(filepath.Dir(path), dirperm)
	if nil != err {
		return
	}

	newpath := path + hex.EncodeToString(r[:])
	file, err := os.OpenFile(newpath, os.O_CREATE|os.O_EXCL|os.O_RDWR, perm)
	if nil != err {
		return
	}
	defer func() {
		file.Close()
		if nil == err {
			err = os.Rename(newpath, path)
		}
		if nil != err {
			os.Remove(newpath)
		}
	}()

	err = fn(file)
	return
}

func WriteData(path string, perm os.FileMode, data []byte) (err error) {
	return WriteFunc(path, perm, func(file *os.File) error {
		n, err := file.Write(data)
		if nil == err && n < len(data) {
			err = io.ErrShortWrite
		}
		return err
	})
}
