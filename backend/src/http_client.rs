use alloy::transports::http::reqwest::Client as AlloyClient;
use reqwest::Client;
use std::sync::Once;
use tracing::warn;

pub fn build_http_client() -> Client {
    if cfg!(target_os = "macos") {
        log_proxy_bypass_warning();
        return build_no_proxy_client();
    }

    match std::panic::catch_unwind(|| Client::builder().build()) {
        Ok(Ok(client)) => client,
        Ok(Err(err)) => {
            warn!(
                "Failed to build HTTP client with system proxy settings: {}. Retrying without proxies.",
                err
            );
            build_no_proxy_client()
        }
        Err(_) => {
            warn!(
                "System proxy discovery panicked while building the HTTP client. Retrying without proxies."
            );
            build_no_proxy_client()
        }
    }
}

pub fn build_alloy_http_client() -> AlloyClient {
    if cfg!(target_os = "macos") {
        log_proxy_bypass_warning();
        return build_no_proxy_alloy_client();
    }

    match std::panic::catch_unwind(|| AlloyClient::builder().build()) {
        Ok(Ok(client)) => client,
        Ok(Err(err)) => {
            warn!(
                "Failed to build Alloy HTTP client with system proxy settings: {}. Retrying without proxies.",
                err
            );
            build_no_proxy_alloy_client()
        }
        Err(_) => {
            warn!(
                "System proxy discovery panicked while building the Alloy HTTP client. Retrying without proxies."
            );
            build_no_proxy_alloy_client()
        }
    }
}

fn build_no_proxy_client() -> Client {
    Client::builder()
        .no_proxy()
        .build()
        .expect("failed to build fallback HTTP client without proxies")
}

fn build_no_proxy_alloy_client() -> AlloyClient {
    AlloyClient::builder()
        .no_proxy()
        .build()
        .expect("failed to build fallback Alloy HTTP client without proxies")
}

fn log_proxy_bypass_warning() {
    static WARN_ONCE: Once = Once::new();

    WARN_ONCE.call_once(|| {
        warn!(
            "Building HTTP clients without system proxy discovery on macOS to avoid reqwest/system-configuration panics."
        );
    });
}
