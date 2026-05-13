/*
 * keyring.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

// Package keyring implements functions for accessing and storing passwords
// in the system's keyring (Keychain on macOS, Credential Manager on
// Windows, Secret Service on Linux).
package keyring

const ErrKeyring = "ErrKeyring"

// Keyring is the interface that a system-specific or custom keyring must
// implement.
type Keyring interface {
	// Get gets the password for a service and user.
	Get(service, user string) (string, error)

	// Set sets the password for a service and user.
	Set(service, user, pass string) error

	// Delete deletes the password for a service and user.
	Delete(service, user string) error
}

// The default keyring.
var DefaultKeyring Keyring

// Get gets the password for a service and user in the default keyring.
func Get(service, user string) (string, error) {
	return DefaultKeyring.Get(service, user)
}

// Set sets the password for a service and user in the default keyring.
func Set(service, user, pass string) error {
	return DefaultKeyring.Set(service, user, pass)
}

// Delete deletes the password for a service and user in the default keyring.
func Delete(service, user string) error {
	return DefaultKeyring.Delete(service, user)
}
