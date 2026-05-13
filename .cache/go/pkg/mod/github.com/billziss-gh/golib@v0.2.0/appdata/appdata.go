/*
 * appdata.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

// Package appdata provides access to well known directories for applications.
package appdata

import "github.com/billziss-gh/golib/errors"

const ErrAppData = "ErrAppData"

type AppData interface {
	ConfigDir() (string, error)
	DataDir() (string, error)
	CacheDir() (string, error)
}

var DefaultAppData AppData

// ConfigDir returns the directory where application configuration files
// should be stored.
func ConfigDir() (string, error) {
	return DefaultAppData.ConfigDir()
}

// DataDir returns the directory where application data files
// should be stored.
func DataDir() (string, error) {
	return DefaultAppData.DataDir()
}

// CacheDir returns the directory where application cache files
// should be stored.
func CacheDir() (string, error) {
	return DefaultAppData.CacheDir()
}

type systemAppData struct {
	configDir string
	dataDir   string
	cacheDir  string
	err       error
}

func (self *systemAppData) ConfigDir() (string, error) {
	if nil != self.err {
		return "", errors.New("", self.err, ErrAppData)
	}

	return self.configDir, nil
}

func (self *systemAppData) DataDir() (string, error) {
	if nil != self.err {
		return "", errors.New("", self.err, ErrAppData)
	}

	return self.dataDir, nil
}

func (self *systemAppData) CacheDir() (string, error) {
	if nil != self.err {
		return "", errors.New("", self.err, ErrAppData)
	}

	return self.cacheDir, nil
}
