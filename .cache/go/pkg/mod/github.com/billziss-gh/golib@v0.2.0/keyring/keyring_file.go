/*
 * keyring_file.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

package keyring

import (
	"bytes"
	"fmt"
	"os"
	"sync"

	"github.com/billziss-gh/golib/config"
	"github.com/billziss-gh/golib/errors"
	"github.com/billziss-gh/golib/util"
)

// FileKeyring is a keyring that stores passwords in a file.
type FileKeyring struct {
	Path string
	Key  []byte
	mux  sync.Mutex
}

func (self *FileKeyring) getConf() (conf config.Config, err error) {
	var data []byte
	if nil == self.Key {
		data, err = util.ReadData(self.Path)
	} else {
		data, err = util.ReadAeData(self.Path, self.Key)
	}

	if nil != err {
		if e, ok := err.(*os.PathError); ok && "open" == e.Op {
			conf = config.Config{}
			err = nil
		}
		return
	}

	conf, err = config.Read(bytes.NewReader(data))
	return
}

func (self *FileKeyring) setConf(conf config.Config) (err error) {
	var buf bytes.Buffer
	err = config.Write(&buf, conf)
	if nil != err {
		return
	}

	if nil == self.Key {
		err = util.WriteData(self.Path, 0600, buf.Bytes())
	} else {
		err = util.WriteAeData(self.Path, 0600, buf.Bytes(), self.Key)
	}

	return
}

func (self *FileKeyring) Get(service, user string) (string, error) {
	self.mux.Lock()
	defer self.mux.Unlock()

	conf, err := self.getConf()
	if nil != err {
		return "", errors.New(fmt.Sprintf("cannot get key %s/%s", service, user), err, ErrKeyring)
	}

	if sect, ok := conf[service]; ok {
		if pass, ok := sect[user]; ok {
			return pass, nil
		}
	}

	return "", errors.New(fmt.Sprintf("cannot get key %s/%s", service, user), nil, ErrKeyring)
}

func (self *FileKeyring) Set(service, user, pass string) error {
	self.mux.Lock()
	defer self.mux.Unlock()

	conf, err := self.getConf()
	if nil != err {
		return errors.New(fmt.Sprintf("cannot set key %s/%s", service, user), err, ErrKeyring)
	}

	if sect, ok := conf[service]; ok {
		sect[user] = pass
	} else {
		sect = config.Section{}
		conf[service] = sect
		sect[user] = pass
	}

	err = self.setConf(conf)
	if nil != err {
		return errors.New(fmt.Sprintf("cannot set key %s/%s", service, user), err, ErrKeyring)
	}

	return nil
}

func (self *FileKeyring) Delete(service, user string) error {
	self.mux.Lock()
	defer self.mux.Unlock()

	conf, err := self.getConf()
	if nil != err {
		return errors.New(fmt.Sprintf("cannot delete key %s/%s", service, user), err, ErrKeyring)
	}

	if sect, ok := conf[service]; ok {
		delete(sect, user)
		if 0 == len(sect) {
			delete(conf, service)
		}
	}

	err = self.setConf(conf)
	if nil != err {
		return errors.New(fmt.Sprintf("cannot delete key %s/%s", service, user), err, ErrKeyring)
	}

	return nil
}
