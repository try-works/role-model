/*
 * keyring_test.go
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
	"os"
	"path/filepath"
	"testing"
)

func TestKeyring(t *testing.T) {
	p, err := Get("keyring", "TestKeyring")
	if "" != p || nil == err {
		t.Error(err)
	}

	err = Set("keyring", "TestKeyring", "hello")
	if nil != err {
		t.Error(err)
	}

	err = Set("keyring", "TestKeyring2", "hello2")
	if nil != err {
		t.Error(err)
	}

	p, err = Get("keyring", "TestKeyring")
	if "hello" != p || nil != err {
		t.Error(err)
	}

	p, err = Get("keyring", "TestKeyring2")
	if "hello2" != p || nil != err {
		t.Error(err)
	}

	err = Set("keyring", "TestKeyring", `mu lti
line
pass
`)
	if nil != err {
		t.Error(err)
	}

	p, err = Get("keyring", "TestKeyring")
	if `mu lti
line
pass
` != p || nil != err {
		t.Error(err)
	}

	err = Delete("keyring", "TestKeyring")
	if nil != err {
		t.Error(err)
	}

	p, err = Get("keyring", "TestKeyring")
	if "" != p || nil == err {
		t.Error(err)
	}

	p, err = Get("keyring", "TestKeyring2")
	if "hello2" != p || nil != err {
		t.Error(err)
	}

	err = Delete("keyring", "TestKeyring2")
	if nil != err {
		t.Error(err)
	}

	p, err = Get("keyring", "TestKeyring2")
	if "" != p || nil == err {
		t.Error(err)
	}
}

func testKeyringInstance(t *testing.T, keyring Keyring) {
	p, err := keyring.Get("keyring", "TestKeyring")
	if "" != p || nil == err {
		t.Error(err)
	}

	err = keyring.Set("keyring", "TestKeyring", "hello")
	if nil != err {
		t.Error(err)
	}

	err = keyring.Set("keyring", "TestKeyring2", "hello2")
	if nil != err {
		t.Error(err)
	}

	p, err = keyring.Get("keyring", "TestKeyring")
	if "hello" != p || nil != err {
		t.Error(err)
	}

	p, err = keyring.Get("keyring", "TestKeyring2")
	if "hello2" != p || nil != err {
		t.Error(err)
	}

	err = keyring.Set("keyring", "TestKeyring", `mu lti
line
pass
`)
	if nil != err {
		t.Error(err)
	}

	p, err = keyring.Get("keyring", "TestKeyring")
	if `mu lti
line
pass
` != p || nil != err {
		t.Error(err)
	}

	err = keyring.Delete("keyring", "TestKeyring")
	if nil != err {
		t.Error(err)
	}

	p, err = keyring.Get("keyring", "TestKeyring")
	if "" != p || nil == err {
		t.Error(err)
	}

	p, err = keyring.Get("keyring", "TestKeyring2")
	if "hello2" != p || nil != err {
		t.Error(err)
	}

	err = keyring.Delete("keyring", "TestKeyring2")
	if nil != err {
		t.Error(err)
	}

	p, err = keyring.Get("keyring", "TestKeyring2")
	if "" != p || nil == err {
		t.Error(err)
	}
}

func TestFileKeyring(t *testing.T) {
	path := filepath.Join(os.TempDir(), "keyring_test")
	os.Remove(path)
	defer os.Remove(path)
	testKeyringInstance(t, &FileKeyring{Path: path})
}

func TestSecureFileKeyring(t *testing.T) {
	path := filepath.Join(os.TempDir(), "keyring_test")
	os.Remove(path)
	defer os.Remove(path)
	testKeyringInstance(t, &FileKeyring{Path: path, Key: []byte("passpasspasspass")})
}

func TestOverlayKeyring(t *testing.T) {
	path1 := filepath.Join(os.TempDir(), "keyring_test1")
	os.Remove(path1)
	defer os.Remove(path1)

	path2 := filepath.Join(os.TempDir(), "keyring_test2")
	os.Remove(path2)
	defer os.Remove(path2)

	ring1 := &FileKeyring{Path: path1}
	ring2 := &FileKeyring{Path: path2}

	testKeyringInstance(t, &OverlayKeyring{Keyrings: []Keyring{ring1, ring2}})
}
