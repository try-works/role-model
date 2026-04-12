use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiteRtLmProvider {
    pub provider_id: String,
    pub integration_target: String,
}

impl LiteRtLmProvider {
    pub fn placeholder() -> Self {
        Self {
            provider_id: "rm_provider_litertlm".to_string(),
            integration_target: "future-native-litertlm".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::LiteRtLmProvider;

    #[test]
    fn exposes_placeholder_provider() {
        let provider = LiteRtLmProvider::placeholder();
        assert_eq!(provider.provider_id, "rm_provider_litertlm");
    }
}
