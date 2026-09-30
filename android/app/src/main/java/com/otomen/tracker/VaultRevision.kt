package com.otomen.tracker

/** JSON bridge numbers may be Integer, Long, or Double. Reject coercion. */
object VaultRevision {
    fun parse(value: Any?): Long {
        require(value is Number) { "Vault revision is required" }
        val numeric = value.toDouble()
        require(numeric.isFinite() && numeric >= 0 && numeric <= 9007199254740991.0 && numeric % 1.0 == 0.0) {
            "Vault revision must be a non-negative safe integer"
        }
        return numeric.toLong()
    }
}
