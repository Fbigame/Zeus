from typing import Optional


# 独立消息定义

class VersionEntry:
    status_1: int
    status_2: int
    status_3: int
    status_4: int
    status_5: int
    version_string: str
    field_10: str
    main_hash_12: str
    main_hash_14: str
    description_17: str
    timestamp_21: int


class FileDetail:
    file_hash: str
    size_or_count_6: int
    size_or_count_7: int


class LanguageSetting:
    class SpecialSetting:
        field_14: int
        field_10: int
    
    # one of lang_data
    language_code: Optional[str]
    special_setting: Optional['LanguageSetting.SpecialSetting']
    status_2: int


class AppHashes:
    app_name: str
    hash_value: str


# AppConfiguration 嵌套定义

class AppConfiguration:
    class InstallInfo:
        supported_languages: list[LanguageSetting]
        install_path: str
        region_code: str
        status_3: int
        status_4: int
        status_5: int
        language_6: str
        language_7: str
        field_9: str
        field_10: str
        account_region: str
        geo_region: str
        field_13: str
    
    class StatusInfo:
        class UnknownBlock2:
            field_1: int  # fixed64
            field_2: int
            field_3: int
            field_5: int
        
        class UnknownBlock3:
            field_1: int  # fixed64
        
        class UnknownBlock4:
            file_details: list[FileDetail]
            field_2: int  # fixed64
            field_4: int
            field_5: int
        
        version_details: list[VersionEntry]
        unknown_block_4: Optional['AppConfiguration.StatusInfo.UnknownBlock4']
        unknown_block_2: Optional['AppConfiguration.StatusInfo.UnknownBlock2']
        unknown_block_3: Optional['AppConfiguration.StatusInfo.UnknownBlock3']
    
    class RuntimeInfo:
        field_2: int  # uint64
    
    app_name_internal: str
    app_id_short: str
    install_info: Optional['AppConfiguration.InstallInfo']
    status_info: Optional['AppConfiguration.StatusInfo']
    runtime_info: Optional['AppConfiguration.RuntimeInfo']
    field_6_str: str
    field_7_int: int
    extra_config_json: str


# ProductDB 顶级定义

class ProductDB:
    class GlobalSettings:
        field_1: int
        field_2: int
        field_3: int
    
    app_configs: list[AppConfiguration]
    app_hashes: list[AppHashes]
    global_settings: Optional['ProductDB.GlobalSettings']
    field_6_value: int
    last_active_app: str
    
    def ParseFromString(self, text: bytes):
        ...
