package com.otomen.tracker

import javax.crypto.spec.SecretKeySpec

/** Keeps the unwrapped vault data key only while the user has an unlocked app session. */
object VaultSession {
    private var dataKey: ByteArray? = null

    @Synchronized fun isUnlocked(): Boolean = dataKey != null

    @Synchronized fun unlock(key: ByteArray) {
        dataKey?.fill(0)
        dataKey = key.copyOf()
        key.fill(0)
    }

    @Synchronized fun <T> withKey(block: (SecretKeySpec) -> T): T {
        val current = dataKey ?: throw SecurityException("Tracker is locked")
        return block(SecretKeySpec(current, "AES"))
    }

    @Synchronized fun lock() {
        dataKey?.fill(0)
        dataKey = null
    }
}
