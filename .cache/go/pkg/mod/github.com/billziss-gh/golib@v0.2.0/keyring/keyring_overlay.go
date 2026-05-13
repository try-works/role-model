/*
 * keyring_overlay.go
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
	"fmt"
	"sync"

	"github.com/billziss-gh/golib/errors"
)

// OverlayKeyring is a keyring that stores passwords in a hierarchy of keyrings.
type OverlayKeyring struct {
	Keyrings []Keyring
	mux      sync.Mutex
}

func (self *OverlayKeyring) Get(service, user string) (string, error) {
	self.mux.Lock()
	defer self.mux.Unlock()

	for _, k := range self.Keyrings {
		v, err := k.Get(service, user)
		if nil == err {
			return v, nil
		}
	}

	return "", errors.New(fmt.Sprintf("cannot get key %s/%s", service, user), nil, ErrKeyring)
}

func (self *OverlayKeyring) Set(service, user, pass string) error {
	self.mux.Lock()
	defer self.mux.Unlock()

	for _, k := range self.Keyrings {
		return k.Set(service, user, pass)
	}

	return errors.New(fmt.Sprintf("cannot set key %s/%s", service, user), nil, ErrKeyring)
}

func (self *OverlayKeyring) Delete(service, user string) error {
	self.mux.Lock()
	defer self.mux.Unlock()

	for _, k := range self.Keyrings {
		return k.Delete(service, user)
	}

	return errors.New(fmt.Sprintf("cannot delete key %s/%s", service, user), nil, ErrKeyring)
}
