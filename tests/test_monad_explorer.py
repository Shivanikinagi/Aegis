"""
Tests for the Monad Explorer module.
Tests connection, link generation, and verification with mocking.
Plus optional live tests when Monad testnet is available.
"""

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch, PropertyMock

import pytest

AGENT_DIR = str(Path(__file__).parent.parent / "agent")
if AGENT_DIR not in sys.path:
    sys.path.insert(0, AGENT_DIR)

from monad_explorer import (
    MonadExplorer, ExplorerLink, TransactionVerification,
    ContractVerification, MONAD_EXPLORER_BASE
)


class TestExplorerLinkGeneration:
    """Tests for explorer link generation (no RPC needed)."""

    @pytest.fixture
    def explorer(self):
        """Explorer with mocked web3 connection."""
        with patch('monad_explorer.Web3') as mock_web3_cls:
            mock_w3 = MagicMock()
            mock_w3.is_connected.return_value = True
            mock_w3.eth.chain_id = 10143
            mock_w3.eth.block_number = 1000000
            mock_w3.from_wei.side_effect = lambda v, unit: v / 1e18

            mock_web3_cls.return_value = mock_w3
            mock_web3_cls.to_checksum_address = lambda a: a
            mock_web3_cls.HTTPProvider = MagicMock()

            exp = MonadExplorer.__new__(MonadExplorer)
            exp.rpc_url = "https://testnet-rpc.monad.xyz"
            exp.explorer_base = "https://testnet.monadvision.com"
            exp.chain_id = 10143
            exp.w3 = mock_w3
            return exp

    def test_tx_link(self, explorer):
        link = explorer.tx_link("0xabc123")
        assert isinstance(link, ExplorerLink)
        assert link.link_type == "tx"
        assert "0xabc123" in link.url
        assert explorer.explorer_base in link.url

    def test_address_link(self, explorer):
        link = explorer.address_link("0xdeadbeef")
        assert link.link_type == "address"
        assert "0xdeadbeef" in link.url

    def test_block_link(self, explorer):
        link = explorer.block_link(12345)
        assert link.link_type == "block"
        assert "12345" in link.url

    def test_token_link(self, explorer):
        link = explorer.token_link("0xtoken")
        assert link.link_type == "token"
        assert "0xtoken" in link.url

    def test_generate_all_contract_links(self, explorer):
        with patch('monad_explorer.blockchain_config') as mock_config:
            mock_config.treasury_address = "0xTreasury"
            mock_config.task_registry_address = "0xTaskReg"
            mock_config.worker_registry_address = "0xWorkerReg"

            links = explorer.generate_all_contract_links()
            assert "Treasury" in links
            assert "TaskRegistry" in links
            assert "WorkerRegistry" in links

    def test_generate_contract_links_empty_addresses(self, explorer):
        with patch('monad_explorer.blockchain_config') as mock_config:
            mock_config.treasury_address = ""
            mock_config.task_registry_address = ""
            mock_config.worker_registry_address = ""

            links = explorer.generate_all_contract_links()
            assert len(links) == 0


class TestTransactionVerification:
    """Tests for transaction verification with mocked web3."""

    @pytest.fixture
    def explorer(self):
        with patch('monad_explorer.Web3') as mock_web3_cls:
            mock_w3 = MagicMock()
            mock_web3_cls.return_value = mock_w3
            mock_web3_cls.HTTPProvider = MagicMock()
            mock_web3_cls.to_checksum_address = lambda a: a

            exp = MonadExplorer.__new__(MonadExplorer)
            exp.rpc_url = "https://testnet-rpc.monad.xyz"
            exp.explorer_base = "https://testnet.monadvision.com"
            exp.chain_id = 10143
            exp.w3 = mock_w3
            return exp

    def test_verify_transaction_success(self, explorer):
        explorer.w3.eth.get_transaction_receipt.return_value = {
            "status": 1,
            "blockNumber": 1000,
            "gasUsed": 21000,
            "from": "0xsender",
            "to": "0xreceiver"
        }
        explorer.w3.eth.get_transaction.return_value = {
            "from": "0xsender",
            "to": "0xreceiver",
            "value": 1000000000000000000
        }
        explorer.w3.eth.get_block.return_value = {"timestamp": 1700000000}

        result = explorer.verify_transaction("0xtxhash")
        assert isinstance(result, TransactionVerification)
        assert result.exists is True
        assert result.status == 1
        assert result.block_number == 1000

    def test_verify_transaction_not_found(self, explorer):
        explorer.w3.eth.get_transaction_receipt.side_effect = Exception("TX not found")

        result = explorer.verify_transaction("0xnotfound")
        assert result.exists is False
        assert result.error is not None

    def test_verify_contract_deployed(self, explorer):
        explorer.w3.eth.get_code.return_value = b'\x60\x60\x40' * 100
        explorer.w3.eth.get_balance.return_value = 5000000000000000000

        # Use a valid-format hex address
        addr = "0xAbCdEf1234567890aBcDeF1234567890AbCdEf12"
        result = explorer.verify_contract(addr)
        assert isinstance(result, ContractVerification)
        assert result.is_deployed is True
        assert result.code_size > 2

    def test_verify_contract_not_deployed(self, explorer):
        explorer.w3.eth.get_code.return_value = b'0x'
        explorer.w3.eth.get_balance.return_value = 0

        addr = "0x0000000000000000000000000000000000000000"
        result = explorer.verify_contract(addr)
        assert result.is_deployed is False


class TestChainQueries:
    """Tests for chain query methods."""

    @pytest.fixture
    def explorer(self):
        with patch('monad_explorer.Web3') as mock_web3_cls:
            mock_w3 = MagicMock()
            mock_w3.from_wei.side_effect = lambda v, unit: v / 1e18 if unit == "ether" else v / 1e9
            mock_web3_cls.return_value = mock_w3
            mock_web3_cls.HTTPProvider = MagicMock()
            mock_web3_cls.to_checksum_address = lambda a: a

            exp = MonadExplorer.__new__(MonadExplorer)
            exp.rpc_url = "https://testnet-rpc.monad.xyz"
            exp.explorer_base = "https://testnet.monadvision.com"
            exp.chain_id = 10143
            exp.w3 = mock_w3
            return exp

    def test_get_block_info(self, explorer):
        explorer.w3.eth.block_number = 500
        explorer.w3.eth.get_block.return_value = {
            "number": 500,
            "hash": b'\xab' * 32,
            "timestamp": 1700000000,
            "transactions": ["tx1", "tx2"],
            "gasUsed": 100000,
            "gasLimit": 30000000,
            "miner": "0xminer"
        }

        info = explorer.get_block_info(500)
        assert info["number"] == 500
        assert info["transaction_count"] == 2

    def test_get_account_info(self, explorer):
        explorer.w3.eth.get_balance.return_value = 5000000000000000000
        explorer.w3.eth.get_transaction_count.return_value = 42
        explorer.w3.eth.get_code.return_value = b'0x'

        # Use a valid hex address for checksum conversion
        addr = "0xAbCdEf1234567890aBcDeF1234567890AbCdEf12"
        info = explorer.get_account_info(addr)
        assert info["balance_wei"] == 5000000000000000000
        assert info["transaction_count"] == 42
        assert info["is_contract"] is False

    def test_get_gas_price(self, explorer):
        explorer.w3.eth.gas_price = 50000000000  # 50 Gwei

        gas = explorer.get_gas_price()
        assert "gas_price_wei" in gas
        assert gas["gas_price_wei"] == 50000000000

    def test_connection_test(self, explorer):
        explorer.w3.is_connected.return_value = True
        explorer.w3.eth.chain_id = 10143
        explorer.w3.eth.block_number = 1000000

        result = explorer.test_connection()
        assert result["connected"] is True
        assert result["chain_id"] == 10143


@pytest.mark.monad
class TestMonadExplorerLive:
    """
    Live tests against Monad testnet.
    Run with: pytest -m monad
    """

    @pytest.fixture
    def live_explorer(self):
        try:
            explorer = MonadExplorer()
            if not explorer.w3.is_connected():
                pytest.skip("Cannot connect to Monad testnet")
            return explorer
        except Exception:
            pytest.skip("MonadExplorer initialization failed")

    def test_live_connection(self, live_explorer):
        result = live_explorer.test_connection()
        assert result["connected"] is True
        assert result["chain_id"] == 10143

    def test_live_gas_price(self, live_explorer):
        gas = live_explorer.get_gas_price()
        assert "gas_price_wei" in gas
        assert gas["gas_price_wei"] > 0

    def test_live_block_info(self, live_explorer):
        info = live_explorer.get_block_info()
        assert "number" in info
        assert info["number"] > 0

    def test_live_full_diagnostics(self, live_explorer):
        diag = live_explorer.run_full_diagnostics()
        assert diag["connection"]["connected"] is True
        assert "contracts" in diag
        assert "summary" in diag
